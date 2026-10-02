import type { AnalysisErrorCode } from "@/types/errors";

export type Plan = "free" | "pro";
export type AnalysisStatus = "processing" | "completed" | "failed";

export const CATEGORIES = [
  "food",
  "cafe",
  "groceries",
  "transport",
  "shopping",
  "subscription",
  "utilities",
  "housing",
  "health",
  "education",
  "entertainment",
  "travel",
  "transfer",
  "income",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface ReadRowsResult {
  /** 원래 행 위치를 유지하여 headerRowIndex와 일치한다. */
  rows: string[][];
  /** 바이너리 Excel은 null이다. */
  encoding: "utf-8" | "cp949" | null;
}

export interface ColumnMapping {
  isTransactions: boolean;
  isKrw: boolean;
  headerRowIndex: number;
  dateColumn: string;
  dateFormat: string;
  assumedYear?: number;
  merchantColumn: string;
  descriptionColumn?: string;
  amount:
    | { mode: "single"; column: string; debitIsNegative: boolean }
    | { mode: "split"; debitColumn: string; creditColumn: string };
}

export interface Transaction {
  /** YYYY-MM-DD 문자열을 그대로 유지한다. */
  occurredOn: string;
  /** 원 단위 양의 정수. 입출금은 direction으로 구분한다. */
  amount: number;
  direction: "debit" | "credit";
  merchant: string;
  description?: string;
  category: Category;
  isRecurring: boolean;
  anomalyType: "duplicate" | "spike" | null;
}

export type TransactionView = Omit<Transaction, "isRecurring" | "anomalyType">;
export type RawTx = Omit<Transaction, "category" | "isRecurring" | "anomalyType">;

export interface AnalysisSummary {
  totalSpend: number;
  byCategory: Partial<Record<Category, number>>;
  topMerchants: { merchant: string; amount: number }[];
  period: { from: string; to: string };
  transactionCount: number;
  skippedRows: number;
}

export interface MonthlyTrend {
  /** YYYY-MM 오름차순이며 누락된 월을 채우지 않는다. */
  points: { month: string; total: number }[];
  comparison: {
    month: string;
    previousMonth: string;
    delta: number;
    /** 전월 합계가 0이면 null이다. */
    percent: number | null;
  } | null;
}

export interface Insight {
  title: string;
  body: string;
  /** 0 이상의 원 단위 정수. */
  monthlySaving: number;
}

export interface SubscriptionRow {
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
}

export interface AnalysisRow {
  id: string;
  userId: string;
  status: AnalysisStatus;
  errorCode: AnalysisErrorCode | null;
  failedUpload: { id: string; filename: string } | null;
  summary: AnalysisSummary | null;
  detections: { recurringCount: number; anomalyCount: number } | null;
  insights: Insight[] | null;
  createdAt: string;
  completedAt: string | null;
}

export interface AnalysisListItem {
  id: string;
  status: AnalysisStatus;
  createdAt: string;
  errorCode?: AnalysisErrorCode;
  filenames: string[];
  totalSpend?: number;
  periodTo?: string;
}

/** 클라이언트에 전달할 때는 반드시 toAnalysisView로 생성한다. */
export interface AnalysisView {
  id: string;
  status: AnalysisStatus;
  errorCode?: AnalysisErrorCode;
  failedUpload?: { id: string; filename: string };
  summary?: AnalysisSummary;
  transactions?: TransactionView[];
  detections?: {
    recurringCount: number;
    anomalyCount: number;
    items?: Transaction[];
  };
  trend?: MonthlyTrend;
  insights?: Insight[] | null;
}
