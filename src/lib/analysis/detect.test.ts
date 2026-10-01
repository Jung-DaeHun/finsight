// @vitest-environment node
import { describe, expect, it } from "vitest";
import { detect } from "@/lib/analysis";
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

describe("detect", () => {
  it("E16: 같은 날·가맹점·금액의 출금은 모두 중복이며 환불은 제외한다", () => {
    const input = [
      tx("2026-09-01", "가게", 12000), tx("2026-09-01", "가게", 12000),
      tx("2026-09-01", "가게", 12000, "food", "credit"),
      tx("2026-09-02", "가게", 12000), tx("2026-09-01", "다른 가게", 12000),
    ];
    const before = structuredClone(input);
    const result = detect(input, []);
    expect(result.map((item) => item.anomalyType)).toEqual(["duplicate", "duplicate", null, null, null]);
    expect(input).toEqual(before);
    expect(result).not.toBe(input);
    result.forEach((item, index) => expect(item).not.toBe(input[index]));
  });

  it("월이 다른 같은 가맹점 출금 중 10% 이내의 거래만 정기결제로 표시한다", () => {
    const input = [
      tx("2026-02-03", "구독", 11000, "subscription"),
      tx("2026-02-07", "구독", 9000, "subscription"),
      tx("2026-02-08", "구독", 8900, "subscription"),
      tx("2026-02-04", "구독", 15000, "subscription"),
      tx("2026-02-05", "구독", 10000, "subscription", "credit"),
      tx("2026-02-06", "일회성", 10000),
    ];
    const history = [tx("2026-01-03", "구독", 10000, "subscription")];
    expect(detect(input, history).map((item) => item.isRecurring)).toEqual([true, true, false, false, false, false]);
  });

  it("이번 거래끼리도 서로 다른 달이면 정기결제를 찾고 같은 달만 있으면 찾지 않는다", () => {
    const input = [
      tx("2026-01-02", "구독", 10000), tx("2026-02-02", "구독", 10500),
      tx("2026-02-03", "다른 곳", 10000), tx("2026-02-04", "다른 곳", 10000),
    ];
    expect(detect(input, []).map((item) => item.isRecurring)).toEqual([true, true, false, false]);
  });

  it("급증은 과거 출금 2건 이상, 평균의 3배 이상, 5만원 이상일 때만 표시한다", () => {
    const history = [
      tx("2026-01-01", "가게", 20000), tx("2026-02-01", "가게", 20000),
      tx("2026-01-01", "한 건", 10000),
      tx("2026-01-01", "환불만", 10000, "food", "credit"),
      tx("2026-02-01", "환불만", 10000, "food", "credit"),
      tx("2026-01-01", "소액", 10000), tx("2026-02-01", "소액", 10000),
    ];
    const result = detect([
      tx("2026-03-01", "가게", 60000), tx("2026-03-02", "가게", 59999),
      tx("2026-03-01", "한 건", 60000), tx("2026-03-01", "환불만", 60000),
      tx("2026-03-01", "소액", 30000),
    ], history);
    expect(result.map((item) => item.anomalyType)).toEqual(["spike", null, null, null, null]);
  });

  it("중복이 급증보다 우선하며 재계산 시 기존 플래그를 덮어쓴다", () => {
    const history = [tx("2026-01-01", "가게", 10000), tx("2026-02-01", "가게", 10000)];
    const input = [tx("2026-03-01", "가게", 60000), tx("2026-03-01", "가게", 60000)];
    input[0].isRecurring = true;
    input[0].anomalyType = "spike";
    const result = detect(input, history);
    expect(result.map((item) => ({ recurring: item.isRecurring, anomaly: item.anomalyType }))).toEqual([
      { recurring: false, anomaly: "duplicate" }, { recurring: false, anomaly: "duplicate" },
    ]);
    expect(input[0]).toMatchObject({ isRecurring: true, anomalyType: "spike" });
  });
});
