import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { limits, resolvePlan } from "@/lib/plan";
import type { AnalysisSummary, Plan, SubscriptionRow, Transaction } from "@/types";
import { DataError, type AnalysisErrorCode } from "@/types/errors";

// 이 모듈의 userId 인자는 getClaims()로 검증한 claims.sub만 전달한다.
export async function getUserPlan(userId: string): Promise<Plan> {
  const { data, error } = await createAdminClient()
    .from("subscriptions")
    .select("status,cancel_at_period_end,current_period_end")
    .eq("user_id", userId)
    .in("status", ["active", "trialing", "past_due"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new DataError("internal_error");
  // 재구독으로 여러 구독 row가 생겨도 유효한 구독이 있으면 Pro이다.
  const subscription: SubscriptionRow | null = data ? {
    status: data.status,
    cancelAtPeriodEnd: data.cancel_at_period_end,
    currentPeriodEnd: data.current_period_end,
  } : null;
  return resolvePlan(subscription);
}

export async function recoverStaleAnalyses(userId: string): Promise<void> {
  const cutoff = new Date(Date.now() - 6 * 60_000).toISOString();
  const { error } = await createAdminClient().from("analyses")
    .update({ status: "failed", error_code: "timeout" })
    .eq("user_id", userId)
    .eq("status", "processing")
    .lt("created_at", cutoff);
  if (error) throw new DataError("internal_error");
}

async function usageForMonth(userId: string, startedAt: string): Promise<number> {
  const { count, error } = await createAdminClient().from("analysis_usage")
    .select("analysis_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("usage_month", `${startedAt.slice(0, 7)}-01`);
  if (error || count === null) throw new DataError("internal_error");
  return count;
}

export async function countMonthlyUsage(userId: string): Promise<number> {
  return usageForMonth(userId, new Date().toISOString());
}

export async function startAnalysis(userId: string, plan: Plan): Promise<{ analysisId: string }> {
  await recoverStaleAnalyses(userId);
  // 한도 확인 도중 월이 바뀌어도 검사 월과 원장 귀속 월을 일치시킨다.
  const startedAt = new Date().toISOString();
  if (await usageForMonth(userId, startedAt) >= limits(plan).monthlyAnalyses) {
    throw new DataError("monthly_limit");
  }
  const { data, error } = await createAdminClient().from("analyses")
    .insert({ user_id: userId, status: "processing", created_at: startedAt })
    .select("id")
    .single();
  if (error?.code === "23505") throw new DataError("analysis_in_progress");
  if (error || !data) throw new DataError("internal_error");
  return { analysisId: data.id };
}

export async function completeAnalysis(
  userId: string,
  analysisId: string,
  result: {
    transactions: Transaction[];
    summary: AnalysisSummary;
    detections: { recurringCount: number; anomalyCount: number };
  },
): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("complete_analysis", {
    p_user_id: userId,
    p_analysis_id: analysisId,
    p_transactions: result.transactions.map((tx) => ({
      occurred_on: tx.occurredOn,
      amount: tx.amount,
      direction: tx.direction,
      merchant: tx.merchant,
      description: tx.description ?? null,
      category: tx.category,
      is_recurring: tx.isRecurring,
      anomaly_type: tx.anomalyType,
    })),
    p_summary: result.summary,
    p_detections: result.detections,
  });
  if (error || typeof data !== "boolean") throw new DataError("internal_error");
  return data;
}

export async function failAnalysis(
  userId: string,
  analysisId: string,
  failure: { code: AnalysisErrorCode; uploadId?: string },
): Promise<void> {
  const admin = createAdminClient();
  if (failure.uploadId !== undefined) {
    const { data, error } = await admin.from("uploads").select("id")
      .eq("user_id", userId)
      .eq("analysis_id", analysisId)
      .eq("id", failure.uploadId)
      .maybeSingle();
    if (error) throw new DataError("internal_error");
    if (!data) throw new DataError("not_found");
  }
  const { error } = await admin.from("analyses").update({
    status: "failed", error_code: failure.code, failed_upload_id: failure.uploadId ?? null,
  })
    .eq("user_id", userId)
    .eq("id", analysisId)
    .eq("status", "processing");
  if (error) throw new DataError("internal_error");
}
