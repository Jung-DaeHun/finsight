// @vitest-environment node
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { SheetError } from "@/lib/sheet/errors";
import { readRows } from "@/lib/sheet/read-rows";

const header = ["날짜", "가맹점", "금액"];
const exampleRows = [header, ["2026-09-01", "가게", "12000"]];
function utf8(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer;
}

// 고정 CP949 바이트로 기대값을 만든다. 파서의 디코더를 재사용하지 않는다.
const koreanBytes: Record<string, number[]> = {
  날: [0xb3, 0xaf], 짜: [0xc2, 0xa5], 가: [0xb0, 0xa1], 맹: [0xb8, 0xcd],
  점: [0xc1, 0xa1], 금: [0xb1, 0xdd], 액: [0xbe, 0xd7], 게: [0xb0, 0xd4],
  똠: [0x8c, 0x63], 햏: [0xc1, 0x64],
};
function cp949(text: string): ArrayBuffer {
  return Uint8Array.from([...text].flatMap((character) => {
    if (character.charCodeAt(0) < 128) return [character.charCodeAt(0)];
    const bytes = koreanBytes[character];
    if (!bytes) throw new Error("fixture에 없는 문자");
    return bytes;
  })).buffer;
}
function csv(rows: string[][], delimiter = ","): string {
  return rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(delimiter)).join("\r\n");
}
function html(rows: string[][]): string {
  return `<html><body><table>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</table></body></html>`;
}
function excel(rows: (string | number | boolean)[][], bookType: "xlsx" | "biff8" = "xlsx", secondRows?: string[][]): ArrayBuffer {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), "첫 시트");
  if (secondRows) XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(secondRows), "둘째 시트");
  return XLSX.write(book, { type: "array", bookType });
}
const formats = [
  { name: "UTF-8 BOM CSV", encode: (rows: string[][]) => utf8(`\uFEFF${csv(rows)}`), encoding: "utf-8" },
  { name: "UTF-8 CSV", encode: (rows: string[][]) => utf8(csv(rows)), encoding: "utf-8" },
  { name: "EUC-KR CSV", encode: (rows: string[][]) => cp949(csv(rows)), encoding: "cp949" },
  { name: "CP949 확장 CSV", encode: (rows: string[][]) => cp949(csv(rows.map((row, i) => i ? [row[0], "똠햏", row[2]] : row))), encoding: "cp949" },
  { name: "UTF-8 HTML-xls", encode: (rows: string[][]) => utf8(html(rows)), encoding: "utf-8" },
  { name: "CP949 HTML-xls", encode: (rows: string[][]) => cp949(html(rows)), encoding: "cp949" },
  { name: "세미콜론 CSV", encode: (rows: string[][]) => utf8(csv(rows, ";")), encoding: "utf-8" },
  { name: "탭 CSV", encode: (rows: string[][]) => utf8(csv(rows, "\t")), encoding: "utf-8" },
  { name: "xlsx", encode: (rows: string[][]) => excel(rows), encoding: null },
  { name: "바이너리 xls", encode: (rows: string[][]) => excel(rows, "biff8"), encoding: null },
] as const;

describe("readRows", () => {
  it.each(formats)("R6 · E2/E3: $name의 한국어와 원문 날짜·금액을 읽는다", ({ name, encode, encoding }) => {
    const rows = name === "CP949 확장 CSV" ? [header, ["2026-09-01", "똠햏", "12000"]] : exampleRows;
    expect(readRows(encode(rows))).toEqual({ rows, encoding });
  });

  describe.each(formats)("R3 · E17: $name 행수 경계", ({ encode }) => {
    it("헤더 포함 1,200행은 성공한다", () => {
      const rows = [header, ...Array.from({ length: 1199 }, () => exampleRows[1])];
      expect(readRows(encode(rows)).rows).toHaveLength(1200);
    });
    it("1,201행은 앞부분을 반환하지 않고 거부한다", () => {
      const rows = [header, ...Array.from({ length: 1200 }, () => exampleRows[1])];
      expect(() => readRows(encode(rows))).toThrowError(new SheetError("too_many_rows"));
    });
  });

  it("R3: 따옴표 안 줄바꿈은 한 행이고 이중 따옴표도 보존한다", () => {
    const rows = [header, ...Array.from({ length: 1199 }, () => ["2026-09-01", '가게\n"지점"', "12000"])];
    expect(readRows(utf8(csv(rows))).rows).toEqual(rows);
  });

  it("E3/E6/E11: 날짜와 숫자처럼 보이는 텍스트를 자동 변환하지 않는다", () => {
    const rows = [header, ["09/01", "00123", "(12,000)"], ["2026.09.02", "가게", "₩12,000"]];
    expect(readRows(utf8(csv(rows))).rows).toEqual(rows);
    expect(readRows(utf8(html([header, rows[1]]))).rows).toEqual([header, rows[1]]);
  });

  it.each(["CSV", "xlsx", "xls", "HTML"])("R3 · E4/E5: %s의 선행·중간 빈 행 위치를 보존한다", (format) => {
    const rows = [["", "", ""], ["제목", "", ""], header, ["", "", ""], exampleRows[1], ["", "합계", "12000"]];
    const bytes = format === "CSV" ? utf8(csv(rows)) : format === "HTML" ? utf8(html(rows)) : excel(rows, format === "xls" ? "biff8" : "xlsx");
    expect(readRows(bytes).rows).toEqual(rows);
  });

  it("R3: CSV의 내용 없는 줄도 시트 행수에 포함한다", () => {
    expect(readRows(utf8(`${csv(exampleRows)}\n${"\n".repeat(1197)}2026-09-02,가게,100`)).rows).toHaveLength(1200);
    expect(() => readRows(utf8(`${csv(exampleRows)}\n${"\n".repeat(1198)}2026-09-02,가게,100`)))
      .toThrowError(new SheetError("too_many_rows"));
  });

  it("R3: xlsx의 사용 범위가 늦게 시작해도 원래 행 위치와 상한을 지킨다", () => {
    expect(readRows(excel([[], [], ...exampleRows])).rows.slice(0, 2)).toEqual([["", "", ""], ["", "", ""]]);
    expect(() => readRows(excel([...Array.from({ length: 1200 }, () => []), header])))
      .toThrowError(new SheetError("too_many_rows"));
  });

  it("첫 시트만 반환하고 둘째 시트의 행수는 검사하지 않는다", () => {
    const second = Array.from({ length: 1201 }, () => exampleRows[1]);
    expect(readRows(excel(exampleRows, "xlsx", second))).toEqual({ rows: exampleRows, encoding: null });
  });

  it("바이너리 셀은 표시 형식에 맞춰 모두 문자열로 변환한다", () => {
    const sheet = XLSX.utils.aoa_to_sheet([["날짜", "금액", "확인"], [46266, 12000, true]]);
    sheet.A2.z = "yyyy-mm-dd";
    sheet.B2.z = "#,##0";
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "내역");
    expect(readRows(XLSX.write(book, { type: "array", bookType: "xlsx" })).rows)
      .toEqual([["날짜", "금액", "확인"], ["2026-09-01", "12,000", "TRUE"]]);
  });

  it("R6: CP949 확장 문자가 들어 있는 HTML-xls도 엄격하게 디코딩한다", () => {
    const rows = [header, ["2026-09-01", "똠햏", "12000"]];
    expect(readRows(cp949(html(rows)))).toEqual({ rows, encoding: "cp949" });
  });

  it.each([[0xff, 0xff], [0x81], [0xc3, 0x28], [0xef, 0xbb, 0xbf, 0xff, 0xff]])(
    "R6: UTF-8과 CP949 모두 잘못된 바이트 %j는 거부한다", (...bytes) => {
      expect(() => readRows(Uint8Array.from(bytes).buffer)).toThrowError(new SheetError("unsupported_encoding"));
    },
  );

  it.each(["", "\uFEFF", "\n\n", "  \r\n  ", "<html><body></body></html>"])("E13: 빈 파일/표 없는 HTML %j는 거부한다", (text) => {
    expect(() => readRows(utf8(text))).toThrowError(new SheetError("file_unreadable"));
  });
  it("E13: 빈 엑셀은 거부하고 헤더만 있는 시트는 정규화에 넘긴다", () => {
    expect(() => readRows(excel([]))).toThrowError(new SheetError("file_unreadable"));
    expect(readRows(excel([header])).rows).toEqual([header]);
  });
  it.each([[0x50, 0x4b, 0x03, 0x04], [0xd0, 0xcf, 0x11, 0xe0, 0, 0, 0, 0]])("깨진 바이너리 %j는 file_unreadable이다", (...bytes) => {
    expect(() => readRows(Uint8Array.from(bytes).buffer)).toThrowError(new SheetError("file_unreadable"));
  });
  it("E1: OLE의 EncryptedPackage 스트림을 암호 파일로 구분한다", () => {
    const cfb = XLSX.CFB.utils.cfb_new();
    XLSX.CFB.utils.cfb_add(cfb, "EncryptedPackage", new Uint8Array([1, 2, 3, 4]));
    const bytes = Uint8Array.from(XLSX.CFB.write(cfb, { type: "buffer" }));
    expect(() => readRows(bytes.buffer)).toThrowError(new SheetError("file_encrypted"));
  });
});
