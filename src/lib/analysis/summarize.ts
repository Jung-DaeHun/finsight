import type { AnalysisSummary, Category, Transaction } from "@/types";

const EXCLUDED_CATEGORIES: ReadonlySet<Category> = new Set(["transfer", "income"]);

export function summarize(txs: Transaction[]): AnalysisSummary {
  const categoryTotals = new Map<Category, number>();
  const merchantTotals = new Map<string, number>();
  let netSpend = 0;
  let from = "";
  let to = "";

  for (const tx of txs) {
    if (!from || tx.occurredOn < from) from = tx.occurredOn;
    if (!to || tx.occurredOn > to) to = tx.occurredOn;
    if (EXCLUDED_CATEGORIES.has(tx.category)) continue;

    const signedAmount = tx.direction === "debit" ? tx.amount : -tx.amount;
    netSpend += signedAmount;
    categoryTotals.set(tx.category, (categoryTotals.get(tx.category) ?? 0) + signedAmount);
    merchantTotals.set(tx.merchant, (merchantTotals.get(tx.merchant) ?? 0) + signedAmount);
  }

  const byCategory: AnalysisSummary["byCategory"] = {};
  for (const [category, amount] of categoryTotals) {
    if (amount > 0) byCategory[category] = amount;
  }

  const topMerchants = [...merchantTotals]
    .filter(([, amount]) => amount > 0)
    .sort(([aName, aAmount], [bName, bAmount]) =>
      bAmount - aAmount || (aName < bName ? -1 : aName > bName ? 1 : 0))
    .slice(0, 5)
    .map(([merchant, amount]) => ({ merchant, amount }));

  return {
    totalSpend: Math.max(0, netSpend),
    byCategory,
    topMerchants,
    period: { from, to },
    transactionCount: txs.length,
    skippedRows: 0,
  };
}
