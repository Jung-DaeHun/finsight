// @vitest-environment node
import { expect, it } from "vitest";
import { detect, monthlyTrend, summarize } from "@/lib/analysis";
import type { Transaction } from "@/types";

it("공개 분석 함수가 동일한 거래 계약으로 함께 동작한다", () => {
  const past: Transaction = {
    occurredOn: "2026-01-10", amount: 10000, direction: "debit",
    merchant: "정기 가게", category: "subscription", isRecurring: false, anomalyType: null,
  };
  const current: Transaction = { ...past, occurredOn: "2026-02-10", amount: 11000 };
  const detected = detect([current], [past]);

  expect(detected[0].isRecurring).toBe(true);
  expect(summarize(detected).totalSpend).toBe(11000);
  expect(monthlyTrend([past, ...detected]).comparison).toEqual({
    month: "2026-02", previousMonth: "2026-01", delta: 1000, percent: 10,
  });
});
