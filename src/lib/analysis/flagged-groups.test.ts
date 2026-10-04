// @vitest-environment node
import { describe, expect, it } from "vitest";
import { flaggedGroups } from "@/lib/analysis";
import type { Transaction } from "@/types";

function tx(
  occurredOn: string,
  merchant: string,
  amount: number,
  flags: Pick<Transaction, "isRecurring" | "anomalyType">,
): Transaction {
  return { occurredOn, merchant, amount, category: "other", direction: "debit", ...flags };
}
const duplicate = { isRecurring: false, anomalyType: "duplicate" } as const;
const spike = { isRecurring: false, anomalyType: "spike" } as const;
const recurring = { isRecurring: true, anomalyType: null } as const;
const normal = { isRecurring: false, anomalyType: null } as const;

describe("flaggedGroups", () => {
  it("같은 유형·가맹점·금액의 탐지 거래를 묶고 건수·합계·날짜를 코드로 계산한다", () => {
    expect(flaggedGroups([
      tx("2026-08-12", "넥슨", 27000, duplicate), tx("2026-08-12", "넥슨", 27000, duplicate),
      tx("2026-08-13", "넥슨", 27000, duplicate), tx("2026-08-20", "식당", 9000, normal),
    ])).toEqual([
      { type: "duplicate", merchant: "넥슨", amount: 27000, count: 3, total: 81000, dates: ["2026-08-12", "2026-08-13"] },
    ]);
  });

  it("이상 유형을 정기결제보다 우선하고 합계가 큰 묶음부터 정렬한다", () => {
    expect(flaggedGroups([
      tx("2026-08-01", "넷플릭스", 17000, recurring),
      tx("2026-08-05", "가전", 500000, spike),
      tx("2026-08-09", "헬스장", 50000, { isRecurring: true, anomalyType: "spike" }),
    ]).map(({ type, merchant }) => [type, merchant])).toEqual([
      ["spike", "가전"], ["spike", "헬스장"], ["recurring", "넷플릭스"],
    ]);
  });

  it("묶음은 합계 상위 20개까지만 반환한다", () => {
    const txs = Array.from({ length: 25 }, (_, index) => tx("2026-08-01", `가맹점${index}`, 1000 + index, spike));
    const groups = flaggedGroups(txs);
    expect(groups).toHaveLength(20);
    expect(groups[0].amount).toBe(1024);
  });
});
