import "server-only";
import { completeAnalysis, failAnalysis, getCompletedHistory, setUploadMapping } from "@/lib/data";
import { readRows } from "@/lib/sheet/read-rows";
import { normalize } from "@/lib/sheet/normalize";
import { SheetError } from "@/lib/sheet/errors";
import { detect, summarize } from "@/lib/analysis";
import { logError } from "@/lib/log";
import type { Plan, Transaction } from "@/types";
import { PipelineError } from "@/types/errors";
import { mapColumns, classifyMerchants } from "./claude";
import { ClaudeServiceError } from "./claude-errors";

export async function runAnalysis(
  userId: string,
  analysisId: string,
  plan: Plan,
  files: { uploadId: string; bytes: ArrayBuffer }[],
): Promise<void> {
  const startedAt = Date.now();
  let uploadId: string | undefined;
  try {
    const transactions: Transaction[] = [];
    let skippedRows = 0;
    for (const file of files) {
      uploadId = file.uploadId;
      const { rows } = readRows(file.bytes);
      // 제목·빈 행을 포함한 첫 행부터 전달해 실제 headerRowIndex를 유지한다.
      const mapping = await mapColumns(rows[0], rows.slice(1, 15), plan);
      if (!mapping.isTransactions) throw new PipelineError("not_transactions", uploadId);
      if (!mapping.isKrw) throw new PipelineError("unsupported_currency", uploadId);
      const { txs, skipped } = normalize(rows, mapping);
      await setUploadMapping(userId, uploadId, { rowCount: rows.length, columnMapping: mapping });
      const categories = await classifyMerchants([...new Set(txs.map((tx) => tx.merchant))], plan);
      transactions.push(...txs.map((tx): Transaction => ({
        ...tx,
        category: Object.hasOwn(categories, tx.merchant) ? categories[tx.merchant] : "other",
        isRecurring: false,
        anomalyType: null,
      })));
      skippedRows += skipped;
    }
    // 이력 조회·완료 RPC 오류는 특정 파일 오류로 표시하지 않는다.
    uploadId = undefined;
    const history = await getCompletedHistory(userId, analysisId);
    const detected = detect(transactions, history);
    const summary = { ...summarize(detected), skippedRows };
    const detections = {
      recurringCount: detected.filter((tx) => tx.isRecurring).length,
      anomalyCount: detected.filter((tx) => tx.anomalyType !== null).length,
    };
    if (!await completeAnalysis(userId, analysisId, { transactions: detected, summary, detections })) {
      throw new PipelineError("timeout");
    }
  } catch (error) {
    // 분류된 오류만 파일 탓으로 기록하고, DB 오류 등 나머지는 uploadId 없는 internal_error로 둔다.
    const known = error instanceof PipelineError || error instanceof SheetError || error instanceof ClaudeServiceError;
    const code = known ? error.code : "internal_error";
    if (!known) uploadId = undefined;
    const failure = { code, ...(uploadId === undefined ? {} : { uploadId }) };
    try {
      await failAnalysis(userId, analysisId, failure);
    } catch {
      // DB 장애로 기록할 수 없으면 다음 서버 접근의 정체 복구에 맡긴다.
    }
    logError("analysis_failed", { code, analysisId, durationMs: Date.now() - startedAt });
    throw new PipelineError(code, uploadId);
  }
}
