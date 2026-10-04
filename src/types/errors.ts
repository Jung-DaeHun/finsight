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
  // DB 장애 등 파일과 무관한 실패. 사용자는 다시 시도하면 된다.
  "internal_error",
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

export const AUTH_ERROR_CODES = [
  "invalid_email", "password_too_short", "password_mismatch", "consent_required", "invalid_credentials",
  "email_not_confirmed", "auth_failed", "auth_link_expired", "oauth_failed", "auth_rate_limited",
] as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];

/** DB 오류 원문 대신 API가 처리할 수 있는 코드만 전달한다. */
export class DataError extends Error {
  constructor(public readonly code: ApiErrorCode) {
    super(code);
    this.name = "DataError";
  }
}

/** 분석 실패 원문 대신 코드와 본인 업로드 ID만 전달한다. */
export class PipelineError extends Error {
  constructor(public readonly code: AnalysisErrorCode, public readonly uploadId?: string) {
    super(code);
    this.name = "PipelineError";
  }
}

/** 삭제 실패 시 원본 경로·DB를 보존하고 재시도할 수 있다. */
export class StorageDeleteError extends Error {
  readonly code = "storage_delete_failed";

  constructor() {
    super("storage_delete_failed");
    this.name = "StorageDeleteError";
  }
}

export type AccountDeletionErrorCode = "subscription_cancel_failed" | "storage_delete_failed" | "account_delete_failed";

/** 탈퇴의 실패 단계만 전달하고 외부 서비스 오류 원문은 버린다. */
export class AccountDeletionError extends Error {
  constructor(public readonly code: AccountDeletionErrorCode) {
    super(code);
    this.name = "AccountDeletionError";
  }
}

/** Polar 응답·시크릿 대신 안전한 서비스 오류 코드만 전달한다. */
export class PolarServiceError extends Error {
  constructor(public readonly code: "internal_error" | "subscription_cancel_failed" = "internal_error") {
    super(code);
    this.name = "PolarServiceError";
  }
}
