// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { completeAnalysis, countMonthlyUsage, createUpload, failAnalysis, findCompletedDuplicate, getCompletedHistory, getUserPlan, recoverStaleAnalyses, setUploadMapping, startAnalysis, uploadOriginal } from "./index";
import { DataError } from "@/types/errors";
import type { AnalysisSummary, ColumnMapping, Transaction } from "@/types";

const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), storageFrom: vi.fn(), upload: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ ...mocks, storage: { from: mocks.storageFrom } }) }));

function query(result: { data?: unknown; error?: unknown; count?: number | null } = {}) {
  const builder = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), lt: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(), neq: vi.fn().mockReturnThis(), range: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockReturnThis(),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: null, error: null, ...result }).then(resolve),
  };
  mocks.from.mockReturnValueOnce(builder);
  return builder;
}

const transaction: Transaction = {
  occurredOn: "2026-09-30", amount: 12000, direction: "debit", merchant: "상점",
  category: "food", isRecurring: true, anomalyType: "duplicate",
};
const summary: AnalysisSummary = {
  totalSpend: 12000, byCategory: { food: 12000 }, topMerchants: [],
  period: { from: "2026-09-30", to: "2026-09-30" }, transactionCount: 1, skippedRows: 0,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.from.mockReset();
  mocks.rpc.mockReset();
  mocks.storageFrom.mockReturnValue({ upload: mocks.upload });
  mocks.upload.mockReset();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-30T23:59:00Z"));
});

describe("분석 생성용 소유권·원본 래퍼", () => {
  const columnMapping: ColumnMapping = {
    isTransactions: true, isKrw: true, headerRowIndex: 0,
    dateColumn: "날짜", dateFormat: "YYYY-MM-DD", merchantColumn: "가맹점",
    amount: { mode: "single", column: "금액", debitIsNegative: false },
  };
  const upload = { uploadId: "upload", filename: "../원본.csv", storagePath: "owner/analysis/upload", fileHash: "hash" };

  it.each([{ data: [] }, { data: [{ id: "upload" }] }])("중복은 본인 uploads와 본인의 completed 분석에만 검사한다 (%j)", async ({ data }) => {
    const q = query({ data });
    expect(await findCompletedDuplicate("owner", ["hash"])).toBe(data.length > 0);
    expect(mocks.from).toHaveBeenCalledWith("uploads");
    expect(q.select.mock.calls[0][0]).toContain("analyses!inner");
    expect(q.eq.mock.calls).toEqual([["user_id", "owner"], ["analyses.user_id", "owner"], ["analyses.status", "completed"]]);
    expect(q.in).toHaveBeenCalledWith("file_hash", ["hash"]);
    expect(q.limit).toHaveBeenCalledWith(1);
  });
  it("빈 해시 목록은 DB에 전달하지 않는다", async () => {
    expect(await findCompletedDuplicate("owner", [])).toBe(false);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("uploads insert 전에 분석 소유권을 확인하고 인증 사용자와 서버 경로를 기록한다", async () => {
    const owned = query({ data: { id: "analysis" } });
    const q = query();
    await createUpload("owner", "analysis", upload);
    expect(owned.eq.mock.calls).toEqual([["user_id", "owner"], ["id", "analysis"]]);
    expect(q.insert).toHaveBeenCalledWith({
      id: "upload", analysis_id: "analysis", user_id: "owner", original_filename: "../원본.csv",
      storage_path: "owner/analysis/upload", file_hash: "hash",
    });
  });
  it("타인·없는 분석에는 uploads를 기록하지 않는다", async () => {
    query();
    await expect(createUpload("owner", "foreign", upload)).rejects.toMatchObject({ code: "not_found" });
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });
  it("매핑은 본인 upload ID 조건으로만 갱신한다", async () => {
    const q = query({ data: { id: "upload" } });
    await setUploadMapping("owner", "upload", { rowCount: 8, columnMapping });
    expect(q.update).toHaveBeenCalledWith({ row_count: 8, column_mapping: columnMapping });
    expect(q.eq.mock.calls).toEqual([["user_id", "owner"], ["id", "upload"]]);
  });
  it("타인·없는 upload의 매핑 갱신은 not_found이다", async () => {
    query();
    await expect(setUploadMapping("owner", "foreign", { rowCount: 8, columnMapping })).rejects.toMatchObject({ code: "not_found" });
  });
  const dbTx = {
    occurred_on: "2026-09-30", amount: "12000", direction: "debit", merchant: "상점",
    description: "설명", category: "food", is_recurring: true, anomaly_type: "duplicate",
    analyses: { user_id: "owner", status: "completed" },
  };
  it("이력은 본인·completed 거래만 조회하고 현재 분석을 제외한다", async () => {
    const q = query({ data: [dbTx] });
    expect(await getCompletedHistory("owner", "current")).toEqual([{ ...transaction, description: "설명" }]);
    expect(mocks.from).toHaveBeenCalledWith("transactions");
    expect(q.select.mock.calls[0][0]).toContain("analyses!inner");
    expect(q.eq.mock.calls).toEqual([["user_id", "owner"], ["analyses.user_id", "owner"], ["analyses.status", "completed"]]);
    expect(q.neq).toHaveBeenCalledWith("analysis_id", "current");
    expect(q.order).toHaveBeenCalledWith("id", { ascending: true });
    expect(q.range).toHaveBeenCalledWith(0, 999);
  });
  it("이력 1,000건 이후도 읽어 탐지 입력이 잘리지 않는다", async () => {
    query({ data: Array.from({ length: 1000 }, () => ({ ...dbTx, description: null })) });
    const second = query({ data: [dbTx] });
    const history = await getCompletedHistory("owner", "current");
    expect(history).toHaveLength(1001);
    expect(history[0]).not.toHaveProperty("description");
    expect(second.range).toHaveBeenCalledWith(1000, 1999);
    expect(second.eq).toHaveBeenCalledWith("user_id", "owner");
  });
  it("안전한 정수 범위를 넘는 DB 금액은 반올림해 분석하지 않는다", async () => {
    query({ data: [{ ...dbTx, amount: "9007199254740993" }] });
    await expect(getCompletedHistory("owner", "current")).rejects.toMatchObject({ code: "internal_error" });
  });
  it("원본은 private 버킷에 바이너리로 저장하고 덮어쓰지 않는다", async () => {
    mocks.upload.mockResolvedValue({ error: null });
    const bytes = new Uint8Array([1, 2, 3]).buffer;
    await uploadOriginal("owner/analysis/upload", bytes);
    expect(mocks.storageFrom).toHaveBeenCalledWith("csv-uploads");
    expect(mocks.upload).toHaveBeenCalledWith("owner/analysis/upload", Buffer.from(bytes), {
      contentType: "application/octet-stream", upsert: false,
    });
  });
  it("Storage 실패 원문은 전파하지 않는다", async () => {
    mocks.upload.mockResolvedValue({ error: { message: "비공개 원문" } });
    await expect(uploadOriginal("owner/analysis/upload", new ArrayBuffer(1))).rejects.toEqual(new DataError("internal_error"));
  });
  it.each(["duplicate", "create", "mapping", "history"])("%s DB 오류 원문 대신 internal_error만 전달한다", async (operation) => {
    if (operation === "create") query({ data: { id: "analysis" } });
    query({ error: { message: "비공개 원문" } });
    const task = operation === "duplicate" ? findCompletedDuplicate("owner", ["hash"])
      : operation === "create" ? createUpload("owner", "analysis", upload)
      : operation === "mapping" ? setUploadMapping("owner", "upload", { rowCount: 1, columnMapping })
      : getCompletedHistory("owner", "current");
    await expect(task).rejects.toEqual(new DataError("internal_error"));
  });
});
afterEach(() => vi.useRealTimers());

describe("사용자별 서버 데이터 접근", () => {
  it.each([null, "active", "trialing", "past_due"])("본인의 유효 구독 %s로 플랜을 결정한다", async (status) => {
    const q = query({ data: status ? { status, cancel_at_period_end: true, current_period_end: "2026-10-29T00:00:00Z" } : null });
    expect(await getUserPlan("owner")).toBe(status ? "pro" : "free");
    expect(mocks.from).toHaveBeenCalledWith("subscriptions");
    expect(q.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(q.in).toHaveBeenCalledWith("status", ["active", "trialing", "past_due"]);
  });
  it("R5: 본인의 6분 초과 processing만 timeout 처리한다", async () => {
    const q = query();
    await recoverStaleAnalyses("owner");
    expect(q.update).toHaveBeenCalledWith({ status: "failed", error_code: "timeout" });
    expect(q.eq.mock.calls).toEqual([["user_id", "owner"], ["status", "processing"]]);
    expect(q.lt).toHaveBeenCalledWith("created_at", "2026-09-30T23:53:00.000Z");
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });
  it("R2: 분석 삭제와 무관하게 본인 원장의 UTC 월만 센다", async () => {
    const q = query({ count: 5 });
    expect(await countMonthlyUsage("owner")).toBe(5);
    expect(mocks.from).toHaveBeenCalledWith("analysis_usage");
    expect(q.select).toHaveBeenCalledWith("analysis_id", { count: "exact", head: true });
    expect(q.eq.mock.calls).toEqual([["user_id", "owner"], ["usage_month", "2026-09-01"]]);
  });
  it.each(["free", "pro"] as const)("R2: %s 한도에 도달하면 처리 중 분석도 만들지 않는다", async (plan) => {
    query();
    query({ count: plan === "free" ? 5 : 50 });
    await expect(startAnalysis("owner", plan)).rejects.toMatchObject({ code: "monthly_limit" });
    expect(mocks.from.mock.calls).toEqual([["analyses"], ["analysis_usage"]]);
  });
  it("정체 복구 → 원장 확인 → 본인 processing 생성 순서로 실행한다", async () => {
    query();
    query({ count: 4 });
    const q = query({ data: { id: "analysis" } });
    expect(await startAnalysis("owner", "free")).toEqual({ analysisId: "analysis" });
    expect(mocks.from.mock.calls).toEqual([["analyses"], ["analysis_usage"], ["analyses"]]);
    expect(q.insert).toHaveBeenCalledWith({ user_id: "owner", status: "processing", created_at: "2026-09-30T23:59:00.000Z" });
  });
  it("R2: processing unique 위반은 analysis_in_progress이다", async () => {
    query(); query({ count: 0 }); query({ error: { code: "23505", message: "비공개 DB 오류" } });
    await expect(startAnalysis("owner", "free")).rejects.toMatchObject({ code: "analysis_in_progress" });
  });
  it("DB 실패는 원문 없이 internal_error로 전달하고 시작을 중단한다", async () => {
    query({ error: { message: "비공개 정보" } });
    await expect(startAnalysis("owner", "free")).rejects.toEqual(new DataError("internal_error"));
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });
  it("원장 count가 없으면 0으로 간주해 한도를 우회하지 않는다", async () => {
    query({ count: null });
    await expect(countMonthlyUsage("owner")).rejects.toMatchObject({ code: "internal_error" });
  });
  it.each([true, false])("R5: 완료는 RPC에만 저장하며 결과 %s를 그대로 반환한다", async (completed) => {
    mocks.rpc.mockResolvedValue({ data: completed, error: null });
    const result = { transactions: [transaction], summary, detections: { recurringCount: 1, anomalyCount: 1 } };
    expect(await completeAnalysis("owner", "analysis", result)).toBe(completed);
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledWith("complete_analysis", {
      p_user_id: "owner", p_analysis_id: "analysis", p_summary: summary, p_detections: result.detections,
      p_transactions: [{ occurred_on: "2026-09-30", amount: 12000, direction: "debit", merchant: "상점", description: null, category: "food", is_recurring: true, anomaly_type: "duplicate" }],
    });
  });
  it("완료 RPC 오류를 완료 성공으로 처리하지 않는다", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "23514", message: "민감한 원문" } });
    await expect(completeAnalysis("owner", "analysis", { transactions: [], summary, detections: { recurringCount: 0, anomalyCount: 0 } }))
      .rejects.toEqual(new DataError("internal_error"));
  });
  it("실패는 본인·해당 ID·processing 조건에서만 변경하고 사용량을 쓰지 않는다", async () => {
    const q = query();
    await failAnalysis("owner", "analysis", { code: "timeout" });
    expect(q.update).toHaveBeenCalledWith({ status: "failed", error_code: "timeout", failed_upload_id: null });
    expect(q.eq.mock.calls).toEqual([["user_id", "owner"], ["id", "analysis"], ["status", "processing"]]);
    expect(mocks.from.mock.calls).toEqual([["analyses"]]);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("실패 파일은 같은 사용자·분석의 업로드임을 확인한 뒤 연결한다", async () => {
    const upload = query({ data: { id: "upload" } });
    const analysis = query();
    await failAnalysis("owner", "analysis", { code: "file_unreadable", uploadId: "upload" });
    expect(upload.eq.mock.calls).toEqual([["user_id", "owner"], ["analysis_id", "analysis"], ["id", "upload"]]);
    expect(analysis.update).toHaveBeenCalledWith({ status: "failed", error_code: "file_unreadable", failed_upload_id: "upload" });
  });
  it("타인·다른 분석·없는 upload ID는 동일하게 거부하고 상태를 변경하지 않는다", async () => {
    query({ data: null });
    await expect(failAnalysis("owner", "analysis", { code: "file_unreadable", uploadId: "foreign" }))
      .rejects.toMatchObject({ code: "not_found" });
    expect(mocks.from.mock.calls).toEqual([["uploads"]]);
  });
});
