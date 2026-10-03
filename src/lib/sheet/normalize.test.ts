// @vitest-environment node
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { SheetError } from "@/lib/sheet/errors";
import { normalize } from "@/lib/sheet/normalize";
import { readRows } from "@/lib/sheet/read-rows";
import type { ColumnMapping } from "@/types";

const header = ["날짜", "가맹점", "금액", "설명"];
const mapping: ColumnMapping = {
  isTransactions: true, isKrw: true, headerRowIndex: 0,
  dateColumn: "날짜", dateFormat: "YYYY-MM-DD", merchantColumn: "가맹점",
  descriptionColumn: "설명", amount: { mode: "single", column: "금액", debitIsNegative: false },
};
const valid = ["2026-09-01", "가게", "12000", "구매"];
function oneRow(date: string, amount = "12000") {
  return [header, [date, "가게", amount, "구매"]];
}

describe("normalize", () => {
  it("컬럼 순서와 공백을 처리하고 RawTx 필드만 만든다", () => {
    const rows = [[" 금액 ", "설명", "가맹점", "날짜"], ["12000", " 구매 ", " 가게 ", "2026-09-01"]];
    const before = JSON.stringify(rows);
    expect(normalize(rows, mapping)).toEqual({ txs: [{
      occurredOn: "2026-09-01", amount: 12000, direction: "debit", merchant: "가게", description: "구매",
    }], skipped: 0 });
    expect(JSON.stringify(rows)).toBe(before);
  });

  it.each(["CSV", "xlsx"])("R3 · E4/E5: %s 제목·빈 행·반복 헤더·합계가 섞여도 총액이 일치한다", (format) => {
    const rows = [["9월 거래내역"], ["조회 기간"], header, valid, [], header,
      ["2026-09-02", "가게", "(2000)", "환불"], ["", "합계", "10000", ""],
      ["", "", "10000", "소계"], ["", "TOTAL", "10000", ""]];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), "내역");
    const bytes = format === "CSV"
      ? new TextEncoder().encode(rows.map((row) => row.join(",")).join("\n")).buffer
      : XLSX.write(book, { type: "array", bookType: "xlsx" });
    const result = normalize(readRows(bytes).rows, { ...mapping, headerRowIndex: 2 });
    expect(result.skipped).toBe(0);
    expect(result.txs).toHaveLength(2);
    expect(result.txs.reduce((sum, tx) => sum + (tx.direction === "debit" ? tx.amount : -tx.amount), 0)).toBe(10000);
  });

  it.each(["합계", "소계", "총계", "total", "Subtotal", "Grand Total", "합 계"])("E5: 날짜가 빈 %s 구조행은 오류/제외 수에 포함하지 않는다", (label) => {
    expect(normalize([header, valid, ["", label, "12000", ""]], mapping).skipped).toBe(0);
  });
  it.each(["합계상점", "Total Coffee", "날짜 오류"])("E5: %s의 날짜 오류를 합계로 무시하지 않는다", (merchant) => {
    expect(() => normalize([header, valid, ["", merchant, "100", ""]], mapping))
      .toThrowError(new SheetError("too_many_invalid_rows"));
  });
  it("E5: 합계 문구가 있어도 날짜가 비어 있지 않으면 거래 검증을 한다", () => {
    expect(normalize([header, ["2026-09-01", "합계", "100", ""]], mapping).txs).toHaveLength(1);
    expect(() => normalize([header, valid, ["오류", "합계", "100", ""]], mapping))
      .toThrowError(new SheetError("too_many_invalid_rows"));
  });

  it.each(["12000", "12,000", "12,000원", "₩12,000", " +12,000 원 ", "₩ 12,000", "12000.00"])("E6: 원화 표기 %s를 정수로 만든다", (amount) => {
    expect(normalize(oneRow("2026-09-01", amount), mapping).txs[0]).toMatchObject({ amount: 12000, direction: "debit" });
  });
  it.each(["(12,000)", "-12,000", "(₩12,000)", "-12,000원"])("E6/E8: %s 환불 금액은 양수와 credit로 만든다", (amount) => {
    expect(normalize(oneRow("2026-09-01", amount), mapping).txs[0]).toMatchObject({ amount: 12000, direction: "credit" });
  });
  it("E8: debitIsNegative가 true이면 음수 출금·양수 입금이다", () => {
    const result = normalize([header, valid, ["2026-09-02", "가게", "-12000", ""]], {
      ...mapping, amount: { mode: "single", column: "금액", debitIsNegative: true },
    });
    expect(result.txs.map((tx) => tx.direction)).toEqual(["credit", "debit"]);
  });
  it.each(["", "1.5", "12,00", "12만원", "100USD", "NaN", "Infinity", "1e3", "9007199254740992", "--100", "(100", "100abc200"])(
    "잘못된 금액 %j를 반올림하거나 숫자만 추출하지 않는다", (amount) => {
      expect(() => normalize([header, valid, ["2026-09-02", "가게", amount, ""]], mapping))
        .toThrowError(new SheetError("too_many_invalid_rows"));
    },
  );

  it("E7: 출금·입금 열을 구분하고 빈 반대편 열·0원을 처리한다", () => {
    const result = normalize([
      ["날짜", "가맹점", "출금", "입금"],
      ["2026-09-01", "가게", "12,000", ""], ["2026-09-02", "가게", "0", "2000"], ["2026-09-03", "가게", "0", "0"],
    ], { ...mapping, descriptionColumn: undefined, amount: { mode: "split", debitColumn: "출금", creditColumn: "입금" } });
    expect(result).toEqual({ txs: [
      { occurredOn: "2026-09-01", merchant: "가게", amount: 12000, direction: "debit" },
      { occurredOn: "2026-09-02", merchant: "가게", amount: 2000, direction: "credit" },
    ], skipped: 1 });
  });
  it.each([["100", "200"], ["-100", ""], ["", "-100"], ["", ""], ["100", "오류"]])("E7: 모호하거나 잘못된 출금/입금 %j는 거부한다", (debit, credit) => {
    expect(() => normalize([
      ["날짜", "가맹점", "출금", "입금"], ["2026-09-01", "가게", "100", ""], ["2026-09-02", "가게", debit, credit],
    ], { ...mapping, descriptionColumn: undefined, amount: { mode: "split", debitColumn: "출금", creditColumn: "입금" } }))
      .toThrowError(new SheetError("too_many_invalid_rows"));
  });

  it.each([
    ["YYYY-MM-DD", "2026-09-01"], ["YYYY.MM.DD", "2026.09.01"], ["YYYY/MM/DD", "2026/09/01"],
    ["YYYYMMDD", "20260901"], ["MM/DD/YYYY", "09/01/2026"], ["DD/MM/YYYY", "01/09/2026"],
    ["YYYY년 M월 D일", "2026년 9월 1일"], ["YYYY-M-D", "2026-9-1"],
  ])("E12: %s 날짜를 YYYY-MM-DD 문자열로 만든다", (dateFormat, date) => {
    expect(normalize(oneRow(date), { ...mapping, dateFormat }).txs[0].occurredOn).toBe("2026-09-01");
  });
  it.each(["2026-02-29", "2026-04-31", "2026-13-01", "2026-00-01", "2026-01-00", "2026-01-32", "0000-01-01", "날짜 오류", "2026/09/01", "2026-09-01junk"])(
    "E14: 잘못된 날짜 %s를 보정하지 않는다", (date) => {
      expect(() => normalize([header, valid, [date, "가게", "100", ""]], mapping)).toThrowError(new SheetError("too_many_invalid_rows"));
    },
  );
  it("윤년 규칙은 세기와 400년 주기까지 검증한다", () => {
    expect(normalize(oneRow("2000-02-29"), mapping).txs[0].occurredOn).toBe("2000-02-29");
    expect(normalize(oneRow("2024-02-29"), mapping).txs[0].occurredOn).toBe("2024-02-29");
    expect(() => normalize([header, valid, ["1900-02-29", "가게", "100", ""]], mapping)).toThrowError(new SheetError("too_many_invalid_rows"));
  });
  it("E11: assumedYear부터 12월→1월마다 연도를 올린다", () => {
    const rows = [header, ...["12/30", "12/31", "01/01", "12/31", "01/02"].map((date) => [date, "가게", "100", ""])];
    expect(normalize(rows, { ...mapping, dateFormat: "MM/DD", assumedYear: 2025 }).txs.map((tx) => tx.occurredOn))
      .toEqual(["2025-12-30", "2025-12-31", "2026-01-01", "2026-12-31", "2027-01-02"]);
  });
  it("E11: 0원·잘못된 금액 행의 유효한 날짜도 연말 넘김에 반영한다", () => {
    const rows = [header, ["12/31", "가게", "100", ""], ["01/01", "가게", "오류", ""],
      ["02/01", "가게", "0", ""], ["02/02", "가게", "100", ""], ["02/03", "가게", "100", ""]];
    const result = normalize(rows, { ...mapping, dateFormat: "MM/DD", assumedYear: 2025 });
    expect(result.txs.map((tx) => tx.occurredOn)).toEqual(["2025-12-31", "2026-02-02", "2026-02-03"]);
    expect(result.skipped).toBe(2);
  });

  it("E14/E15: 오류율 20%는 허용하며 잘못된 행과 0원만 skipped로 센다", () => {
    const rows = [header, valid, valid, valid, ["오류", "가게", "100", ""], ["2026-09-02", "가게", "0", ""], [], header, ["", "합계", "36000", ""]];
    expect(normalize(rows, mapping)).toMatchObject({ skipped: 2, txs: [expect.anything(), expect.anything(), expect.anything()] });
  });
  it("E14: 구조행으로 분모를 늘려 20% 초과 오류를 감추지 않는다", () => {
    expect(() => normalize([header, valid, valid, valid, ["오류", "가게", "100", ""], [], header, ["", "합계", "36000", ""]], mapping))
      .toThrowError(new SheetError("too_many_invalid_rows"));
  });
  it.each([{ rows: [header] }, { rows: [header, [], ["", "합계", "0", ""]] }, { rows: oneRow("2026-09-01", "0") }])("E13: 유효 거래가 없으면 not_transactions이다", ({ rows }) => {
    expect(() => normalize(rows, mapping)).toThrowError(new SheetError("not_transactions"));
  });
  it("E16: 같은 날·가맹점·금액의 중복 거래도 둘 다 보존한다", () => {
    expect(normalize([header, valid, valid], mapping).txs).toHaveLength(2);
  });
  it("R7 · E9/E10: 매핑된 원화 청구액만 사용한다", () => {
    const rows = [["날짜", "가맹점", "USD", "원화 청구액", "할부 총액"], ["2026-09-01", "해외 가게", "10.50", "14000", "140000"]];
    expect(normalize(rows, { ...mapping, descriptionColumn: undefined, amount: { mode: "single", column: "원화 청구액", debitIsNegative: false } }).txs[0].amount).toBe(14000);
  });
  it.each([
    { isTransactions: false, code: "not_transactions" }, { isKrw: false, code: "unsupported_currency" },
    { headerRowIndex: -1, code: "mapping_failed" }, { headerRowIndex: 100, code: "mapping_failed" },
    { headerRowIndex: 0.5, code: "mapping_failed" }, { dateColumn: "없는 열", code: "mapping_failed" },
    { descriptionColumn: "없는 열", code: "mapping_failed" }, { dateFormat: "자동 판별", code: "mapping_failed" },
    { dateFormat: "MM/DD", assumedYear: undefined, code: "mapping_failed" },
  ] as const)("잘못된 매핑은 $code로 구분한다", ({ code, ...patch }) => {
    expect(() => normalize([header, valid], { ...mapping, ...patch })).toThrowError(new SheetError(code));
  });
  it("중복 헤더 이름 때문에 매핑 열이 모호하면 거부한다", () => {
    expect(() => normalize([[...header, "금액"], [...valid, "20000"]], mapping)).toThrowError(new SheetError("mapping_failed"));
  });
});
