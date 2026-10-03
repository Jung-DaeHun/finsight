import type { AnalysisErrorCode, ApiErrorCode } from "@/types/errors";

export function apiError(
  code: ApiErrorCode | AnalysisErrorCode,
  status: number,
  extra?: { analysisId?: string; uploadId?: string },
): Response {
  const error: {
    code: ApiErrorCode | AnalysisErrorCode;
    analysisId?: string;
    uploadId?: string;
  } = { code };

  if (extra?.analysisId !== undefined) error.analysisId = extra.analysisId;
  if (extra?.uploadId !== undefined) error.uploadId = extra.uploadId;

  return Response.json({ error }, { status });
}
