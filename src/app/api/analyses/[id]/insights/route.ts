import { getUserId } from "@/lib/auth";
import { getAnalysisForInsights, getCompletedHistory, getUserPlan, saveInsights } from "@/lib/data";
import { monthlyTrend } from "@/lib/analysis";
import { apiError } from "@/lib/api-error";
import { logError } from "@/lib/log";
import { generateInsights } from "@/services/claude";
import { ClaudeServiceError } from "@/services/claude-errors";
import { DataError } from "@/types/errors";

export const maxDuration = 300;
export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const startedAt = Date.now();
  let analysisId: string | undefined;
  try {
    const userId = await getUserId();
    if (!userId) return apiError("unauthorized", 401);
    ({ id: analysisId } = await params);
    const analysis = await getAnalysisForInsights(userId, analysisId);
    if (!analysis) return apiError("not_found", 404);
    if (await getUserPlan(userId) !== "pro") return apiError("pro_required", 403);
    if (analysis.insights !== null) return Response.json({ insights: analysis.insights });
    const trend = monthlyTrend(await getCompletedHistory(userId));
    const generated = await generateInsights({ summary: analysis.summary, detections: analysis.detections, trend });
    const insights = await saveInsights(userId, analysisId, generated);
    return Response.json({ insights });
  } catch (error) {
    const code = error instanceof ClaudeServiceError && error.code === "timeout" ? "timeout"
      : error instanceof DataError && error.code === "not_found" ? "not_found" : "internal_error";
    logError("insights_failed", { code, analysisId, durationMs: Date.now() - startedAt });
    return apiError(code, code === "timeout" ? 504 : code === "not_found" ? 404 : 500);
  }
}
