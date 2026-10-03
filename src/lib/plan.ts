import { CATEGORIES } from "@/types";
import type {
  AnalysisRow,
  AnalysisSummary,
  AnalysisView,
  MonthlyTrend,
  Plan,
  SubscriptionRow,
  Transaction,
  TransactionView,
} from "@/types";

export function resolvePlan(sub: SubscriptionRow | null): Plan {
  return sub && ["active", "trialing", "past_due"].includes(sub.status)
    ? "pro"
    : "free";
}

export function limits(plan: Plan) {
  return {
    maxFiles: plan === "pro" ? 3 : 1,
    maxBytesPerFile: 1_048_576,
    maxSheetRows: 1200,
    monthlyAnalyses: plan === "pro" ? 50 : 5,
  };
}

function toTransactionView(transaction: Transaction): TransactionView {
  const view: TransactionView = {
    occurredOn: transaction.occurredOn,
    amount: transaction.amount,
    direction: transaction.direction,
    merchant: transaction.merchant,
    category: transaction.category,
  };
  if (transaction.description !== undefined) {
    view.description = transaction.description;
  }
  return view;
}

export function toAnalysisView(
  { row, transactions, trend }: {
    row: AnalysisRow;
    transactions: Transaction[];
    trend: MonthlyTrend | null;
  },
  plan: Plan,
): AnalysisView {
  const view: AnalysisView = { id: row.id, status: row.status };

  if (row.status === "failed") {
    if (row.errorCode !== null) view.errorCode = row.errorCode;
    if (row.failedUpload !== null) {
      view.failedUpload = {
        id: row.failedUpload.id,
        filename: row.failedUpload.filename,
      };
    }
    return view;
  }
  if (row.status !== "completed") return view;

  // JSON 컬럼의 중첩 데이터도 허용된 필드만 선택한다.
  if (row.summary !== null) {
    const summary = row.summary;
    const byCategory: AnalysisSummary["byCategory"] = {};
    for (const category of CATEGORIES) {
      if (summary.byCategory[category] !== undefined) {
        byCategory[category] = summary.byCategory[category];
      }
    }
    view.summary = {
      totalSpend: summary.totalSpend,
      byCategory,
      topMerchants: summary.topMerchants.map((item) => ({
        merchant: item.merchant,
        amount: item.amount,
      })),
      period: { from: summary.period.from, to: summary.period.to },
      transactionCount: summary.transactionCount,
      skippedRows: summary.skippedRows,
    };
  }
  view.transactions = transactions.map(toTransactionView);
  if (row.detections !== null) {
    view.detections = {
      recurringCount: row.detections.recurringCount,
      anomalyCount: row.detections.anomalyCount,
    };
    if (plan === "pro") {
      view.detections.items = transactions
        .filter((transaction) => transaction.isRecurring || transaction.anomalyType !== null)
        .map((transaction) => ({
          ...toTransactionView(transaction),
          isRecurring: transaction.isRecurring,
          anomalyType: transaction.anomalyType,
        }));
    }
  }

  if (plan === "pro") {
    if (trend !== null) {
      view.trend = {
        points: trend.points.map((point) => ({ month: point.month, total: point.total })),
        comparison: trend.comparison === null ? null : {
          month: trend.comparison.month,
          previousMonth: trend.comparison.previousMonth,
          delta: trend.comparison.delta,
          percent: trend.comparison.percent,
        },
      };
    }
    view.insights = row.insights === null ? null : row.insights.map((insight) => ({
      title: insight.title,
      body: insight.body,
      monthlySaving: insight.monthlySaving,
    }));
  }

  return view;
}
