import type { Transaction } from "@/types";

const RECURRING_AMOUNT_TOLERANCE = 0.1;
const SPIKE_MULTIPLIER = 3;
const SPIKE_MIN_AMOUNT = 50_000;

interface RecurringCandidate {
  amount: number;
  month: string;
  currentIndex: number | null;
}

function recurringIndices(txs: Transaction[], history: Transaction[]): Set<number> {
  const byMerchant = new Map<string, RecurringCandidate[]>();
  for (const [currentIndex, tx] of txs.entries()) {
    if (tx.direction !== "debit") continue;
    const entries = byMerchant.get(tx.merchant) ?? [];
    entries.push({ amount: tx.amount, month: tx.occurredOn.slice(0, 7), currentIndex });
    byMerchant.set(tx.merchant, entries);
  }
  for (const tx of history) {
    if (tx.direction !== "debit") continue;
    const entries = byMerchant.get(tx.merchant);
    if (entries) entries.push({ amount: tx.amount, month: tx.occurredOn.slice(0, 7), currentIndex: null });
  }

  const recurring = new Set<number>();
  for (const entries of byMerchant.values()) {
    entries.sort((a, b) => a.amount - b.amount);
    const leftDifferent: number[] = [];
    const rightDifferent: number[] = [];
    for (let i = 1; i < entries.length; i++) {
      leftDifferent[i] = entries[i - 1].month === entries[i].month ? leftDifferent[i - 1] : i - 1;
    }
    for (let i = entries.length - 2; i >= 0; i--) {
      rightDifferent[i] = entries[i + 1].month === entries[i].month ? rightDifferent[i + 1] : i + 1;
    }

    for (const [index, entry] of entries.entries()) {
      if (entry.currentIndex === null) continue;
      for (const candidateIndex of [leftDifferent[index], rightDifferent[index]]) {
        if (candidateIndex === undefined) continue;
        const otherAmount = entries[candidateIndex].amount;
        if (Math.abs(entry.amount - otherAmount) <= Math.max(entry.amount, otherAmount) * RECURRING_AMOUNT_TOLERANCE) {
          recurring.add(entry.currentIndex);
          break;
        }
      }
    }
  }
  return recurring;
}

export function detect(txs: Transaction[], history: Transaction[]): Transaction[] {
  const duplicateCounts = new Map<string, number>();
  for (const tx of txs) {
    if (tx.direction !== "debit") continue;
    const key = JSON.stringify([tx.occurredOn, tx.merchant, tx.amount]);
    duplicateCounts.set(key, (duplicateCounts.get(key) ?? 0) + 1);
  }

  const historyAmounts = new Map<string, { total: number; count: number }>();
  for (const tx of history) {
    if (tx.direction !== "debit") continue;
    const existing = historyAmounts.get(tx.merchant) ?? { total: 0, count: 0 };
    existing.total += tx.amount;
    existing.count++;
    historyAmounts.set(tx.merchant, existing);
  }

  const recurring = recurringIndices(txs, history);
  return txs.map((tx, index) => {
    if (tx.direction !== "debit") return { ...tx, isRecurring: false, anomalyType: null };
    const key = JSON.stringify([tx.occurredOn, tx.merchant, tx.amount]);
    const prior = historyAmounts.get(tx.merchant);
    const anomalyType = (duplicateCounts.get(key) ?? 0) >= 2
      ? "duplicate"
      : prior && prior.count >= 2 && tx.amount >= SPIKE_MIN_AMOUNT &&
          tx.amount >= (prior.total / prior.count) * SPIKE_MULTIPLIER
        ? "spike"
        : null;
    return { ...tx, isRecurring: recurring.has(index), anomalyType };
  });
}
