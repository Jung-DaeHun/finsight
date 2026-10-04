import * as XLSX from "xlsx";
import * as cpexcel from "xlsx/dist/cpexcel.full.mjs";
import type { ReadRowsResult } from "@/types";
import { SheetError } from "./errors";

XLSX.set_cptable(cpexcel);
const cp949 = cpexcel as unknown as {
  utils: {
    decode: (codepage: number, bytes: Uint8Array) => string;
    encode: (codepage: number, text: string) => Uint8Array;
  };
};

const MAX_READ_ROWS = 1201;
const OLE_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0];

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

function decodeText(bytes: Uint8Array): { text: string; encoding: "utf-8" | "cp949" } {
  const withoutBom = startsWith(bytes, [0xef, 0xbb, 0xbf]) ? bytes.subarray(3) : bytes;
  for (const [label, encoding] of [["utf-8", "utf-8"], ["euc-kr", "cp949"]] as const) {
    try {
      const text = new TextDecoder(label, { fatal: true }).decode(withoutBom);
      if (!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\ufffd\ufdd0-\ufdef]/u.test(text)) {
        return { text, encoding };
      }
    } catch {
      // 다음 인코딩을 시도한다.
    }
  }
  // Node/ICU의 euc-kr 디코더는 일부 CP949 확장 글자를 거부한다.
  // 이미 xls codepage용으로 로드한 SheetJS 표를 역변환 검증 후 사용한다.
  const text = cp949.utils.decode(949, withoutBom);
  const encoded = cp949.utils.encode(949, text);
  if (encoded.length === withoutBom.length && encoded.every((byte: number, index: number) => byte === withoutBom[index]) &&
      !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\ufffd\ufdd0-\ufdef]/u.test(text)) {
    return { text, encoding: "cp949" };
  }
  throw new SheetError("unsupported_encoding");
}

function isEncryptedOle(bytes: Uint8Array): boolean {
  try {
    const container = XLSX.CFB.read(bytes, { type: "array" });
    return container.FullPaths.some((path: string) => /(?:^|\/)EncryptedPackage\/?$/i.test(path));
  } catch {
    throw new SheetError("file_unreadable");
  }
}

function isEncryptionError(error: unknown): boolean {
  return error instanceof Error && /encrypt|password|protected|암호|비밀번호/i.test(error.message);
}

/** 첫 시트의 원래 행 번호를 보존한다. 빈 행도 1,200행 한도에 포함한다. */
export function readRows(bytes: ArrayBuffer): ReadRowsResult {
  const data = new Uint8Array(bytes);
  if (data.length === 0) throw new SheetError("file_unreadable");

  const isZip = startsWith(data, [0x50, 0x4b]);
  const isOle = startsWith(data, OLE_SIGNATURE);
  if (isOle && isEncryptedOle(data)) throw new SheetError("file_encrypted");

  let input: ArrayBuffer | string = bytes;
  let encoding: ReadRowsResult["encoding"] = null;
  if (!isZip && !isOle) {
    const decoded = decodeText(data);
    // SheetJS는 `</td >`처럼 공백 있는 닫는 태그를 인식하지 못해 옆 셀과 합친다(카드사 HTML-xls).
    input = decoded.text.replace(/<\/(td|th)\s+>/gi, "</$1>");
    encoding = decoded.encoding;
    if (!decoded.text.trim()) throw new SheetError("file_unreadable");
    // HTML 확장자의 일반 텍스트나 표 없는 HTML을 CSV로 오인하지 않는다.
    if (/^\s*</.test(decoded.text) && !/<table\b/i.test(decoded.text)) {
      throw new SheetError("file_unreadable");
    }
  }

  try {
    const workbook = XLSX.read(input, {
      type: typeof input === "string" ? "string" : "array",
      sheetRows: MAX_READ_ROWS,
      raw: typeof input === "string",
      sheets: 0,
      // 엑셀 기본 날짜 서식(m/d/yy)은 연도가 두 자리라 매핑할 수 없으므로 YYYY-MM-DD로 표시한다.
      dateNF: "yyyy-mm-dd",
    });
    const firstName = workbook.SheetNames[0];
    const sheet = firstName === undefined ? undefined : workbook.Sheets[firstName];
    if (!sheet?.["!ref"]) throw new SheetError("file_unreadable");

    const parsedRange = XLSX.utils.decode_range(sheet["!ref"]);
    const fullRange = sheet["!fullref"] ? XLSX.utils.decode_range(sheet["!fullref"]) : null;
    if (parsedRange.e.r >= 1200 || (fullRange && fullRange.e.r >= 1200)) {
      throw new SheetError("too_many_rows");
    }

    const range = { s: { r: 0, c: 0 }, e: parsedRange.e };
    const cells = XLSX.utils.sheet_to_json<(string | number | boolean)[]>(sheet, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: true,
      range,
    });
    const rows = cells.map((row) => row.map((cell) => String(cell)));
    if (!rows.length || rows.every((row) => row.every((cell) => !cell.trim()))) {
      throw new SheetError("file_unreadable");
    }
    return { rows, encoding };
  } catch (error) {
    if (error instanceof SheetError) throw error;
    throw new SheetError(isEncryptionError(error) ? "file_encrypted" : "file_unreadable");
  }
}
