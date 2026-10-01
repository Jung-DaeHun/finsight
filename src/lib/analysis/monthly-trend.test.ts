// @vitest-environment node
import { describe, expect, it } from "vitest";
import { monthlyTrend } from "@/lib/analysis";
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

describe("monthlyTrend", () => {
  it("3.2 · E12: 거래일 문자열로 월을 묶고 환불을 차감하며 이체·수입은 제외한다", () => {
    const history = [
      tx("2026-02-01", "식당", 30000), tx("2026-01-31", "식당", 10000),
      tx("2026-02-02", "식당", 5000, "food", "credit"),
      tx("2026-02-03", "급여", 100000, "income", "credit"),
      tx("2026-02-04", "카드대금", 100000, "transfer"),
    ];
    const before = structuredClone(history);
    expect(monthlyTrend(history)).toEqual({
      points: [{ month: "2026-01", total: 10000 }, { month: "2026-02", total: 25000 }],
      comparison: { month: "2026-02", previousMonth: "2026-01", delta: 15000, percent: 150 },
    });
    expect(history).toEqual(before);
  });

  it("연도를 넘어가는 달력상 직전 월을 비교하고 퍼센트를 소수 1자리로 반올림한다", () => {
    expect(monthlyTrend([
      tx("2026-01-01", "A", 1400), tx("2025-12-31", "A", 3000),
    ]).comparison).toEqual({ month: "2026-01", previousMonth: "2025-12", delta: -1600, percent: -53.3 });
  });

  it("직전 달이 빠지면 비교하지 않고 관측하지 않은 달을 채우지 않는다", () => {
    expect(monthlyTrend([
      tx("2026-01-01", "A", 10000), tx("2026-03-01", "A", 20000),
    ])).toEqual({
      points: [{ month: "2026-01", total: 10000 }, { month: "2026-03", total: 20000 }],
      comparison: null,
    });
  });

  it("관측 월의 순지출이 0이면 점을 유지하고 전월 대비 퍼센트는 null이다", () => {
    expect(monthlyTrend([
      tx("2026-04-01", "카드대금", 100000, "transfer"),
      tx("2026-05-01", "식당", 10000),
    ])).toEqual({
      points: [{ month: "2026-04", total: 0 }, { month: "2026-05", total: 10000 }],
      comparison: { month: "2026-05", previousMonth: "2026-04", delta: 10000, percent: null },
    });
  });

  it("환불이 더 많아도 해당 월은 0원으로 제한한다", () => {
    expect(monthlyTrend([
      tx("2026-05-01", "식당", 10000), tx("2026-05-02", "식당", 20000, "food", "credit"),
    ])).toEqual({ points: [{ month: "2026-05", total: 0 }], comparison: null });
  });

  it("거래가 없으면 빈 추이를 반환한다", () => {
    expect(monthlyTrend([])).toEqual({ points: [], comparison: null });
  });
});
