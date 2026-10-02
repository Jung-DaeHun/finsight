import { createHash, randomUUID } from "node:crypto";
import { getUserId } from "@/lib/auth";
import { createUpload, failAnalysis, findCompletedDuplicate, getUserPlan, startAnalysis, uploadOriginal } from "@/lib/data";
import { limits } from "@/lib/plan";
import { apiError } from "@/lib/api-error";
import { logError } from "@/lib/log";
import { runAnalysis } from "@/services/analysis-pipeline";
import { DataError, PipelineError } from "@/types/errors";

export const maxDuration = 300;
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const startedAt = Date.now();
  let userId: string | null = null;
  let analysisId: string | undefined;
  let uploadId: string | undefined;
  let pipelineStarted = false;
  try {
    userId = await getUserId();
    if (!userId) return apiError("unauthorized", 401);
    const plan = await getUserPlan(userId);
    const { maxFiles, maxBytesPerFile } = limits(plan);
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return apiError("file_unreadable", 400);
    }
    const entries = form.getAll("files");
    if (entries.length < 1 || entries.length > maxFiles || entries.some((entry) => !(entry instanceof File))) {
      return apiError("too_many_files", 400);
    }
    const files = entries as File[];
    if (files.some((file) => file.size > maxBytesPerFile)) return apiError("file_too_large", 400);
    const sources = await Promise.all(files.map(async (file) => {
      const bytes = await file.arrayBuffer();
      return { filename: file.name, bytes, fileHash: createHash("sha256").update(Buffer.from(bytes)).digest("hex") };
    }));
    if (await findCompletedDuplicate(userId, sources.map((file) => file.fileHash))) {
      return apiError("duplicate_file", 409);
    }
    ({ analysisId } = await startAnalysis(userId, plan));
    const uploaded: { uploadId: string; bytes: ArrayBuffer }[] = [];
    for (const file of sources) {
      // insert 실패 시 존재하지 않는 ID를 failed_upload_id로 연결하지 않는다.
      uploadId = undefined;
      const nextUploadId = randomUUID();
      const storagePath = `${userId}/${analysisId}/${nextUploadId}`;
      await createUpload(userId, analysisId, {
        uploadId: nextUploadId, filename: file.filename, storagePath, fileHash: file.fileHash,
      });
      uploadId = nextUploadId;
      try {
        await uploadOriginal(storagePath, file.bytes);
      } catch {
        throw new PipelineError("storage_upload_failed", uploadId);
      }
      uploaded.push({ uploadId, bytes: file.bytes });
    }
    uploadId = undefined;
    pipelineStarted = true;
    await runAnalysis(userId, analysisId, plan, uploaded);
    return Response.json({ analysisId }, { status: 201 });
  } catch (error) {
    const code = error instanceof PipelineError || error instanceof DataError ? error.code : "internal_error";
    if (!pipelineStarted) {
      if (userId && analysisId) {
        try {
          await failAnalysis(userId, analysisId, {
            code: "storage_upload_failed", ...(uploadId === undefined ? {} : { uploadId }),
          });
        } catch {
          // 원본·경로를 유지하고 DB 복구 후 다음 접근에서 정체 분석을 복구한다.
        }
      }
      logError("analysis_failed", {
        code, ...(analysisId === undefined ? {} : { analysisId }), durationMs: Date.now() - startedAt,
      });
    }
    const status = error instanceof PipelineError ? (code === "timeout" ? 504 : 422)
      : code === "monthly_limit" ? 429
      : code === "analysis_in_progress" ? 409
      : code === "not_found" ? 404 : 500;
    return apiError(code, status, {
      analysisId, uploadId: error instanceof PipelineError ? error.uploadId : undefined,
    });
  }
}
