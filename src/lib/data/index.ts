import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { limits, resolvePlan, toAnalysisView } from "@/lib/plan";
import { monthlyTrend } from "@/lib/analysis";
import type { AnalysisListItem, AnalysisRow, AnalysisStatus, AnalysisSummary, AnalysisView, ColumnMapping, Insight, Plan, SubscriptionRow, Transaction } from "@/types";
import { DataError, type AnalysisErrorCode } from "@/types/errors";
export { getSubscriptionSummary, upsertSubscription, userExists } from "./subscriptions";

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

export async function findCompletedDuplicate(userId: string, hashes: string[]): Promise<boolean> {
  if (hashes.length === 0) return false;
  const { data, error } = await createAdminClient().from("uploads")
    .select("id,analyses!inner(user_id,status)")
    .eq("user_id", userId)
    .eq("analyses.user_id", userId)
    .eq("analyses.status", "completed")
    .in("file_hash", hashes)
    .limit(1);
  if (error || !data) throw new DataError("internal_error");
  return data.length > 0;
}

export async function createUpload(
  userId: string,
  analysisId: string,
  upload: { uploadId: string; filename: string; storagePath: string; fileHash: string },
): Promise<void> {
  const admin = createAdminClient();
  const owned = await admin.from("analyses").select("id")
    .eq("user_id", userId)
    .eq("id", analysisId)
    .maybeSingle();
  if (owned.error) throw new DataError("internal_error");
  if (!owned.data) throw new DataError("not_found");
  const { error } = await admin.from("uploads").insert({
    id: upload.uploadId,
    analysis_id: analysisId,
    user_id: userId,
    original_filename: upload.filename,
    storage_path: upload.storagePath,
    file_hash: upload.fileHash,
  });
  if (error) throw new DataError("internal_error");
}

export async function setUploadMapping(
  userId: string,
  uploadId: string,
  mapping: { rowCount: number; columnMapping: ColumnMapping },
): Promise<void> {
  const { data, error } = await createAdminClient().from("uploads")
    .update({ row_count: mapping.rowCount, column_mapping: mapping.columnMapping })
    .eq("user_id", userId)
    .eq("id", uploadId)
    .select("id")
    .maybeSingle();
  if (error) throw new DataError("internal_error");
  if (!data) throw new DataError("not_found");
}

export async function getCompletedHistory(userId: string, excludeAnalysisId?: string): Promise<Transaction[]> {
  const admin = createAdminClient();
  const history: Transaction[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    let query = admin.from("transactions")
      .select("occurred_on,amount,direction,merchant,description,category,is_recurring,anomaly_type,analyses!inner(user_id,status)")
      .eq("user_id", userId)
      .eq("analyses.user_id", userId)
      .eq("analyses.status", "completed");
    if (excludeAnalysisId !== undefined) query = query.neq("analysis_id", excludeAnalysisId);
    const { data, error } = await query
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error || !data) throw new DataError("internal_error");
    for (const row of data) {
      history.push(toTransaction(row));
    }
    if (data.length < pageSize) return history;
  }
}

export async function uploadOriginal(storagePath: string, bytes: ArrayBuffer): Promise<void> {
  const { error } = await createAdminClient().storage.from("csv-uploads")
    .upload(storagePath, Buffer.from(bytes), { contentType: "application/octet-stream", upsert: false });
  if (error) throw new DataError("internal_error");
}

interface AnalysisRecord {
  id: string;
  user_id: string;
  status: AnalysisStatus;
  error_code: AnalysisErrorCode | null;
  failed_upload_id: string | null;
  summary: AnalysisSummary | null;
  detections: AnalysisRow["detections"];
  insights: Insight[] | null;
  created_at: string;
  completed_at: string | null;
}

type TransactionRecord = {
  occurred_on: string;
  amount: number | string;
  direction: Transaction["direction"];
  merchant: string;
  description: string | null;
  category: Transaction["category"];
  is_recurring: boolean;
  anomaly_type: Transaction["anomalyType"];
};

function toTransaction(row: TransactionRecord): Transaction {
  const amount = Number(row.amount);
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new DataError("internal_error");
  return {
    occurredOn: row.occurred_on, amount, direction: row.direction, merchant: row.merchant,
    ...(row.description === null ? {} : { description: row.description }),
    category: row.category, isRecurring: row.is_recurring, anomalyType: row.anomaly_type,
  };
}

async function ownedAnalysis<T>(userId: string, analysisId: string, columns: string, completedOnly = false): Promise<T | null> {
  let query = createAdminClient().from("analyses").select(columns)
    .eq("user_id", userId).eq("id", analysisId);
  if (completedOnly) query = query.eq("status", "completed");
  const { data, error } = await query.maybeSingle<T>();
  // UUID 형식이 아닌 요청 ID도 알 수 없는 ID와 같은 결과로 처리한다.
  if (error?.code === "22P02") return null;
  if (error) throw new DataError("internal_error");
  return data;
}

async function analysisTransactions(userId: string, analysisId: string): Promise<Transaction[]> {
  const transactions: Transaction[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await createAdminClient().from("transactions")
      .select("occurred_on,amount,direction,merchant,description,category,is_recurring,anomaly_type")
      .eq("user_id", userId).eq("analysis_id", analysisId)
      .order("id", { ascending: true }).range(offset, offset + 999);
    if (error || !data) throw new DataError("internal_error");
    transactions.push(...data.map(toTransaction));
    if (data.length < 1000) return transactions;
  }
}

export async function getAnalysisView(userId: string, analysisId: string): Promise<AnalysisView | null> {
  await recoverStaleAnalyses(userId);
  const record = await ownedAnalysis<AnalysisRecord>(userId, analysisId,
    "id,user_id,status,error_code,failed_upload_id,summary,detections,insights,created_at,completed_at");
  if (!record) return null;
  const plan = await getUserPlan(userId);
  let failedUpload: AnalysisRow["failedUpload"] = null;
  if (record.status === "failed" && record.failed_upload_id !== null) {
    const { data, error } = await createAdminClient().from("uploads").select("id,original_filename")
      .eq("user_id", userId).eq("analysis_id", analysisId).eq("id", record.failed_upload_id)
      .maybeSingle();
    if (error) throw new DataError("internal_error");
    if (data) failedUpload = { id: data.id, filename: data.original_filename };
  }
  const row: AnalysisRow = {
    id: record.id, userId: record.user_id, status: record.status, errorCode: record.error_code,
    failedUpload, summary: record.summary, detections: record.detections, insights: record.insights,
    createdAt: record.created_at, completedAt: record.completed_at,
  };
  const transactions = record.status === "completed" ? await analysisTransactions(userId, analysisId) : [];
  const trend = record.status === "completed" && plan === "pro"
    ? monthlyTrend([...await getCompletedHistory(userId, analysisId), ...transactions]) : null;
  return toAnalysisView({ row, transactions, trend }, plan);
}

export async function listAnalyses(userId: string): Promise<AnalysisListItem[]> {
  await recoverStaleAnalyses(userId);
  const rows: Pick<AnalysisRecord, "id" | "status" | "created_at" | "error_code" | "summary">[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await createAdminClient().from("analyses")
      .select("id,status,created_at,error_code,summary")
      .eq("user_id", userId).order("created_at", { ascending: false }).order("id", { ascending: true })
      .range(offset, offset + 999);
    if (error || !data) throw new DataError("internal_error");
    rows.push(...data);
    if (data.length < 1000) break;
  }
  const filenames = new Map<string, string[]>();
  for (let start = 0; start < rows.length; start += 1000) {
    const ids = rows.slice(start, start + 1000).map((row) => row.id);
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await createAdminClient().from("uploads")
        .select("analysis_id,original_filename")
        .eq("user_id", userId).in("analysis_id", ids)
        .order("id", { ascending: true }).range(offset, offset + 999);
      if (error || !data) throw new DataError("internal_error");
      for (const upload of data) {
        const names = filenames.get(upload.analysis_id) ?? [];
        names.push(upload.original_filename);
        filenames.set(upload.analysis_id, names);
      }
      if (data.length < 1000) break;
    }
  }
  return rows.map((row) => ({
    id: row.id, status: row.status, createdAt: row.created_at, filenames: filenames.get(row.id) ?? [],
    ...(row.status === "failed" && row.error_code !== null ? { errorCode: row.error_code } : {}),
    ...(row.status === "completed" && row.summary !== null ? {
      totalSpend: row.summary.totalSpend, periodTo: row.summary.period.to,
    } : {}),
  }));
}

function insightFields(insights: Insight[]): Insight[] {
  return insights.map((insight) => ({ title: insight.title, body: insight.body, monthlySaving: insight.monthlySaving }));
}

export async function getAnalysisForInsights(userId: string, analysisId: string): Promise<{
  summary: AnalysisSummary;
  detections: NonNullable<AnalysisRow["detections"]>;
  insights: Insight[] | null;
} | null> {
  const row = await ownedAnalysis<Pick<AnalysisRecord, "summary" | "detections" | "insights">>(
    userId, analysisId, "summary,detections,insights", true,
  );
  if (!row) return null;
  if (!row.summary || !row.detections) throw new DataError("internal_error");
  return {
    summary: row.summary,
    detections: { recurringCount: row.detections.recurringCount, anomalyCount: row.detections.anomalyCount },
    insights: row.insights === null ? null : insightFields(row.insights),
  };
}

export async function saveInsights(userId: string, analysisId: string, insights: Insight[]): Promise<Insight[]> {
  const { data, error } = await createAdminClient().from("analyses")
    .update({ insights: insightFields(insights) }).eq("user_id", userId).eq("id", analysisId)
    .eq("status", "completed").is("insights", null).select("insights")
    .maybeSingle<{ insights: Insight[] }>();
  if (error) throw new DataError("internal_error");
  if (data) return insightFields(data.insights);
  // 동시 생성에서는 먼저 저장한 값을 재사용하고 삭제된 분석은 404로 처리한다.
  const existing = await getAnalysisForInsights(userId, analysisId);
  if (!existing) throw new DataError("not_found");
  if (existing.insights === null) throw new DataError("internal_error");
  return existing.insights;
}

export async function getAnalysisStatus(userId: string, analysisId: string): Promise<AnalysisStatus | null> {
  const row = await ownedAnalysis<Pick<AnalysisRecord, "status">>(userId, analysisId, "status");
  return row?.status ?? null;
}

/** Storage 삭제 완료를 확인한 deletion 서비스에서만 호출한다. */
export async function deleteAnalysisRecord(userId: string, analysisId: string): Promise<boolean> {
  const { data, error } = await createAdminClient().from("analyses").delete()
    .eq("user_id", userId).eq("id", analysisId).neq("status", "processing")
    .select("id").maybeSingle();
  if (error) throw new DataError("internal_error");
  return data !== null;
}
