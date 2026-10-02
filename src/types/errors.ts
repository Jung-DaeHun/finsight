export const ANALYSIS_ERROR_CODES = [
  "not_transactions",
  "mapping_failed",
  "too_many_invalid_rows",
  "file_unreadable",
  "file_encrypted",
  "llm_unavailable",
  "timeout",
  "too_many_rows",
  "unsupported_encoding",
  "unsupported_currency",
  "storage_upload_failed",
] as const;

export const API_ERROR_CODES = [
  "unauthorized",
  "not_found",
  "file_too_large",
  "too_many_files",
  "monthly_limit",
  "duplicate_file",
  "already_pro",
  "pro_required",
  "analysis_in_progress",
  "storage_delete_failed",
  "subscription_cancel_failed",
  "account_delete_failed",
  "internal_error",
] as const;

export type AnalysisErrorCode = (typeof ANALYSIS_ERROR_CODES)[number];
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/** DB 오류 원문 대신 API가 처리할 수 있는 코드만 전달한다. */
export class DataError extends Error {
  constructor(public readonly code: ApiErrorCode) {
    super(code);
    this.name = "DataError";
  }
}
