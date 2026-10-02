import { getUserId } from "@/lib/auth";
import { apiError } from "@/lib/api-error";
import { logError } from "@/lib/log";
import { deleteAnalysis } from "@/services/deletion";
import { StorageDeleteError } from "@/types/errors";

export const runtime = "nodejs";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const startedAt = Date.now();
  let analysisId: string | undefined;
  try {
    const userId = await getUserId();
    if (!userId) return apiError("unauthorized", 401);
    ({ id: analysisId } = await params);
    const result = await deleteAnalysis(userId, analysisId);
    if (result === "not_found") return apiError("not_found", 404);
    if (result === "in_progress") return apiError("analysis_in_progress", 409);
    return new Response(null, { status: 204 });
  } catch (error) {
    const code = error instanceof StorageDeleteError ? "storage_delete_failed" : "internal_error";
    logError("analysis_delete_failed", { code, analysisId, durationMs: Date.now() - startedAt });
    return apiError(code, code === "storage_delete_failed" ? 502 : 500);
  }
}
