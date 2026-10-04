import type { Transaction } from "@/types";

export interface FlaggedGroup {
  type: "duplicate" | "spike" | "recurring";
  merchant: string;
  amount: number;
  count: number;
  total: number;
  /** 오름차순, 중복 없음. */
  dates: string[];
}

const MAX_GROUPS = 20;

/** 인사이트 입력용으로 탐지 거래를 유형·가맹점·금액별로 묶는다. 건수·합계는 LLM이 아니라 여기서 계산한다. */
export function flaggedGroups(txs: Transaction[]): FlaggedGroup[] {
  const groups = new Map<string, FlaggedGroup>();
  for (const tx of txs) {
    const type = tx.anomalyType ?? (tx.isRecurring ? "recurring" : null);
    if (!type) continue;
    const key = JSON.stringify([type, tx.merchant, tx.amount]);
    const group = groups.get(key) ?? { type, merchant: tx.merchant, amount: tx.amount, count: 0, total: 0, dates: [] };
    group.count += 1;
    group.total += tx.amount;
    if (!group.dates.includes(tx.occurredOn)) group.dates.push(tx.occurredOn);
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((group) => ({ ...group, dates: group.dates.sort() }))
    .sort((a, b) => b.total - a.total || (a.merchant < b.merchant ? -1 : a.merchant > b.merchant ? 1 : 0))
    .slice(0, MAX_GROUPS);
}
