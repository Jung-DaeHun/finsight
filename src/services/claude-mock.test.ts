// @vitest-environment node
import { describe, expect, it } from "vitest";
import { normalize } from "@/lib/sheet/normalize";
import { mapColumns, classifyMerchants, generateInsights } from "./claude-mock";

describe("Claude mock fixture", () => {
  it("E4: 제목 다음 카드 헤더를 찾아 원화 거래를 정규화한다", async () => {
    const rows = [["2026년 9월 카드 명세서"], ["이용일", "가맹점", "이용금액", "내용"], ["2026.09.01", "카페", "12000", "커피"]];
    const result = await mapColumns(rows[0], rows.slice(1), "free");
    expect(result).toMatchObject({ isTransactions: true, isKrw: true, headerRowIndex: 1, amount: { mode: "single", column: "이용금액" } });
    expect(normalize(rows, result).txs[0]).toMatchObject({ amount: 12000, merchant: "카페" });
  });

  it("E7/E11: 은행 출금·입금 열과 연도 없는 날짜를 처리한다", async () => {
    const rows = [["거래일", "적요", "출금액", "입금액"], ["12/31", "급여", "", "100000"], ["01/01", "상점", "5000", ""]];
    const result = await mapColumns(rows[0], rows.slice(1), "free");
    expect(result).toMatchObject({ isKrw: true, dateFormat: "MM/DD", amount: { mode: "split", debitColumn: "출금액", creditColumn: "입금액" } });
    expect(result.assumedYear).toEqual(expect.any(Number));
    expect(normalize(rows, result).txs.map((tx) => tx.occurredOn.slice(0, 4))).toEqual([String(result.assumedYear), String(result.assumedYear! + 1)]);
  });

  it("R7: 해외 결제가 섞이면 원화 환산 열을 고른다", async () => {
    const rows = [["거래일", "가맹점", "USD 금액", "원화 환산 금액"], ["2026-09-01", "SHOP", "10", "14000"]];
    const result = await mapColumns(rows[0], rows.slice(1), "pro");
    expect(result).toMatchObject({ isKrw: true, amount: { mode: "single", column: "원화 환산 금액" } });
    expect(normalize(rows, result).txs[0].amount).toBe(14000);
  });

  it("E9: 할부는 이번 달 청구금액을 고른다", async () => {
    const result = await mapColumns(["이용일", "가맹점", "이용금액", "이번달 청구금액"], [["2026-09-01", "상점", "120000", "10000"]], "free");
    expect(result.amount).toMatchObject({ column: "이번달 청구금액" });
  });

  it("R7: 외화 전용과 거래내역이 아닌 표를 구분한다", async () => {
    expect((await mapColumns(["거래일", "가맹점", "USD 금액"], [], "free")).isKrw).toBe(false);
    expect((await mapColumns(["이름", "전화번호"], [], "free")).isTransactions).toBe(false);
  });
});

it("mock은 키워드 분류와 고정 한국어 인사이트를 반환한다", async () => {
  expect(await classifyMerchants(["스타벅스 강남", "배민", "넷플릭스", "모르는 곳"], "free"))
    .toEqual({ "스타벅스 강남": "cafe", 배민: "food", 넷플릭스: "subscription", "모르는 곳": "other" });
  const insights = await generateInsights({ summary: { totalSpend: 100000, byCategory: {}, topMerchants: [], period: { from: "2026-09-01", to: "2026-09-30" }, transactionCount: 2, skippedRows: 0 }, detections: { recurringCount: 1, anomalyCount: 0 } });
  expect(insights).toHaveLength(3);
  expect(insights.every((item) => Number.isInteger(item.monthlySaving) && item.monthlySaving >= 0)).toBe(true);
  expect(insights[0].body).toContain("100,000");
});
