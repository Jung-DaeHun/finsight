import type { MonthlyTrend, Transaction } from "@/types";
import { summarize } from "./summarize";

function previousMonth(month: string): string {
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  return monthNumber === 1
    ? `${String(year - 1).padStart(4, "0")}-12`
    : `${String(year).padStart(4, "0")}-${String(monthNumber - 1).padStart(2, "0")}`;
}

export function monthlyTrend(history: Transaction[]): MonthlyTrend {
  const byMonth = new Map<string, Transaction[]>();
  for (const tx of history) {
    const month = tx.occurredOn.slice(0, 7);
    const entries = byMonth.get(month) ?? [];
    entries.push(tx);
    byMonth.set(month, entries);
  }

  const points = [...byMonth]
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([month, txs]) => ({ month, total: summarize(txs).totalSpend }));
  const latest = points.at(-1);
  if (!latest) return { points, comparison: null };

  const previous = points.find((point) => point.month === previousMonth(latest.month));
  if (!previous) return { points, comparison: null };

  const delta = latest.total - previous.total;
  return {
    points,
    comparison: {
      month: latest.month,
      previousMonth: previous.month,
      delta,
      percent: previous.total === 0 ? null : Math.round(delta / previous.total * 1000) / 10,
    },
  };
}
