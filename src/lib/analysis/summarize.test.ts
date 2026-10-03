// @vitest-environment node
import { describe, expect, it } from "vitest";
import { summarize } from "@/lib/analysis";
import type { Category, Transaction } from "@/types";

function tx(
  occurredOn: string,
  merchant: string,
  amount: number,
  category: Category = "food",
  direction: Transaction["direction"] = "debit",
): Transaction {
  return { occurredOn, merchant, amount, category, direction, isRecurring: false, anomalyType: null };
}

describe("summarize", () => {
  it("E8 · 3.1: 환불을 차감하고 이체·수입은 지출에서 제외한다", () => {
    const result = summarize([
      tx("2026-09-30", "식당", 30000),
      tx("2026-09-02", "식당", 5000, "food", "credit"),
      tx("2026-09-15", "마트", 12000, "groceries"),
      tx("2026-09-16", "카드대금", 90000, "transfer"),
      tx("2026-09-17", "급여", 2000000, "income", "credit"),
    ]);
    expect(result).toEqual({
      totalSpend: 37000,
      byCategory: { food: 25000, groceries: 12000 },
      topMerchants: [{ merchant: "식당", amount: 25000 }, { merchant: "마트", amount: 12000 }],
      period: { from: "2026-09-02", to: "2026-09-30" },
      transactionCount: 5,
      skippedRows: 0,
    });
  });

  it("전체 순지출은 0으로 제한하고 순지출이 0 이하인 카테고리·가맹점은 제외한다", () => {
    expect(summarize([
      tx("2026-01-01", "식당", 5000),
      tx("2026-01-02", "식당", 9000, "food", "credit"),
      tx("2026-01-03", "마트", 1000, "groceries"),
      tx("2026-01-04", "마트", 1000, "groceries", "credit"),
    ])).toMatchObject({ totalSpend: 0, byCategory: {}, topMerchants: [] });
  });

  it("가맹점 순지출을 합산해 상위 5개만 금액 내림차순으로 반환한다", () => {
    const result = summarize([
      tx("2026-01-01", "A", 5000), tx("2026-01-01", "B", 4000),
      tx("2026-01-01", "C", 3000), tx("2026-01-01", "D", 2000),
      tx("2026-01-01", "E", 1000), tx("2026-01-01", "F", 6000),
      tx("2026-01-01", "A", 2000, "food", "credit"),
    ]);
    expect(result.topMerchants).toEqual([
      { merchant: "F", amount: 6000 }, { merchant: "B", amount: 4000 },
      { merchant: "A", amount: 3000 }, { merchant: "C", amount: 3000 },
      { merchant: "D", amount: 2000 },
    ]);
  });

  it("입력이 비어 있어도 형태가 일정하다", () => {
    expect(summarize([])).toEqual({
      totalSpend: 0, byCategory: {}, topMerchants: [],
      period: { from: "", to: "" }, transactionCount: 0, skippedRows: 0,
    });
  });
});
