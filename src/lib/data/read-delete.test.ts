// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteAnalysisRecord, getAnalysisForInsights, getAnalysisStatus, getFlaggedTransactions, getAnalysisView, listAnalyses, saveInsights } from "./index";
import { DataError } from "@/types/errors";
import type { AnalysisSummary, Insight } from "@/types";

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => mocks }));

function query(result: { data?: unknown; error?: unknown } = {}) {
  const builder = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), lt: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(), neq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), range: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(), delete: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockReturnThis(),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: null, error: null, ...result }).then(resolve),
  };
  mocks.from.mockReturnValueOnce(builder);
  return builder;
}
const summary: AnalysisSummary = {
  totalSpend: 12000, byCategory: { food: 12000 }, topMerchants: [{ merchant: "상점", amount: 12000 }],
  period: { from: "2026-09-01", to: "2026-09-30" }, transactionCount: 1, skippedRows: 0,
};
const insights: Insight[] = [{ title: "제안", body: "지출을 확인하세요", monthlySaving: 1000 }];
const row = {
  id: "analysis", user_id: "owner", status: "completed", error_code: null, failed_upload_id: null,
  summary, detections: { recurringCount: 1, anomalyCount: 1 }, insights,
  created_at: "2026-10-01T00:00:00Z", completed_at: "2026-10-01T00:01:00Z",
};
const dbTx = {
  id: "tx", occurred_on: "2026-09-30", amount: "12000", direction: "debit", merchant: "상점",
  description: null, category: "food", is_recurring: true, anomaly_type: "duplicate",
};
beforeEach(() => mocks.from.mockReset());

describe("R4·R8: 서버 분석 읽기와 허용 필드", () => {
  it.each(["missing", "foreign"])("%s 분석은 정체 복구 뒤 null이며 플랜·거래를 조회하지 않는다", async (id) => {
    const recovery = query();
    const owned = query();
    expect(await getAnalysisView("owner", id)).toBeNull();
    expect(recovery.update).toHaveBeenCalledWith({ status: "failed", error_code: "timeout" });
    expect(owned.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(owned.eq).toHaveBeenCalledWith("id", id);
    expect(mocks.from.mock.calls).toEqual([["analyses"], ["analyses"]]);
  });
  it.each(["free", "pro"])("3.4·6.1: %s는 기존 분석도 현재 플랜에 맞게 직렬화한다", async (plan) => {
    query(); query({ data: row });
    query({ data: plan === "pro" ? { status: "active", cancel_at_period_end: false, current_period_end: null } : null });
    const txs = query({ data: [dbTx] });
    const history = plan === "pro" ? query({ data: [{ ...dbTx, occurred_on: "2026-08-30", amount: 10000 }] }) : null;
    const view = await getAnalysisView("owner", "analysis");
    expect(view?.summary).toEqual(summary);
    expect(view?.transactions).toEqual([{
      occurredOn: "2026-09-30", amount: 12000, direction: "debit", merchant: "상점", category: "food",
    }]);
    expect(txs.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(txs.eq).toHaveBeenCalledWith("analysis_id", "analysis");
    expect(view).not.toHaveProperty("userId");
    if (plan === "free") {
      expect(view).not.toHaveProperty("trend"); expect(view).not.toHaveProperty("insights");
      expect(view?.detections).toEqual({ recurringCount: 1, anomalyCount: 1 });
      expect(mocks.from).toHaveBeenCalledTimes(4);
    } else {
      expect(view?.detections?.items?.[0]).toMatchObject({ isRecurring: true, anomalyType: "duplicate" });
      expect(view?.insights).toEqual(insights);
      expect(view?.trend).toEqual({
        points: [{ month: "2026-08", total: 10000 }, { month: "2026-09", total: 12000 }],
        comparison: { month: "2026-09", previousMonth: "2026-08", delta: 2000, percent: 20 },
      });
      expect(history?.eq.mock.calls).toEqual([["user_id", "owner"], ["analyses.user_id", "owner"], ["analyses.status", "completed"]]);
      expect(history?.neq).toHaveBeenCalledWith("analysis_id", "analysis");
    }
  });
  it("3,600건 거래도 페이지 끝까지 읽는다", async () => {
    query(); query({ data: row }); query();
    const pages = [1000, 1000, 1000, 600].map((count) => query({ data: Array.from({ length: count }, () => dbTx) }));
    expect((await getAnalysisView("owner", "analysis"))?.transactions).toHaveLength(3600);
    for (const [index, page] of pages.entries()) {
      expect(page.range).toHaveBeenCalledWith(index * 1000, index * 1000 + 999);
      expect(page.eq).toHaveBeenCalledWith("user_id", "owner");
      expect(page.eq).toHaveBeenCalledWith("analysis_id", "analysis");
      expect(page.order).toHaveBeenCalledWith("id", { ascending: true });
    }
  });
  it("processing에는 메타데이터만 주고 거래·유료 이력을 읽지 않는다", async () => {
    query(); query({ data: { ...row, status: "processing" } }); query({ data: { status: "active" } });
    expect(await getAnalysisView("owner", "analysis")).toEqual({ id: "analysis", status: "processing" });
    expect(mocks.from).toHaveBeenCalledTimes(3);
  });
  it.each([true, false])("failed 파일은 동일 사용자·분석의 upload일 때만 파일명을 제공한다 (%s)", async (ownedUpload) => {
    query(); query({ data: { ...row, status: "failed", error_code: "file_unreadable", failed_upload_id: "upload" } }); query();
    const upload = query({ data: ownedUpload ? { id: "upload", original_filename: "원본.csv", storage_path: "비공개 경로" } : null });
    expect(await getAnalysisView("owner", "analysis")).toEqual({
      id: "analysis", status: "failed", errorCode: "file_unreadable",
      ...(ownedUpload ? { failedUpload: { id: "upload", filename: "원본.csv" } } : {}),
    });
    expect(upload.eq.mock.calls).toEqual([["user_id", "owner"], ["analysis_id", "analysis"], ["id", "upload"]]);
  });
  it("목록은 정체 복구 후 본인 파일명·요약 메타데이터만 반환한다", async () => {
    query();
    const analyses = query({ data: [row, { ...row, id: "failed", status: "failed", error_code: "timeout" }] });
    const uploads = query({ data: [
      { analysis_id: "analysis", original_filename: "카드.csv", storage_path: "비공개 경로" },
      { analysis_id: "analysis", original_filename: "계좌.xls" },
    ] });
    expect(await listAnalyses("owner")).toEqual([
      { id: "analysis", status: "completed", createdAt: row.created_at, filenames: ["카드.csv", "계좌.xls"], totalSpend: 12000, periodTo: "2026-09-30" },
      { id: "failed", status: "failed", createdAt: row.created_at, errorCode: "timeout", filenames: [] },
    ]);
    expect(analyses.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(analyses.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(uploads.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(uploads.in).toHaveBeenCalledWith("analysis_id", ["analysis", "failed"]);
    expect(analyses.select.mock.calls[0][0]).not.toMatch(/transactions|detections|insights/);
  });
  it("빈 목록은 uploads를 조회하지 않는다", async () => {
    query(); query({ data: [] });
    expect(await listAnalyses("owner")).toEqual([]);
    expect(mocks.from).toHaveBeenCalledTimes(2);
  });
  it("분석 목록도 1,000건 이후를 누락하지 않는다", async () => {
    query(); query({ data: Array.from({ length: 1000 }, (_, i) => ({ ...row, id: `analysis-${i}` })) });
    const second = query({ data: [row] });
    query({ data: [] }); query({ data: [] });
    expect(await listAnalyses("owner")).toHaveLength(1001);
    expect(second.range).toHaveBeenCalledWith(1000, 1999);
  });
  it("DB 금액을 안전한 정수로 변환할 수 없으면 거부한다", async () => {
    query(); query({ data: row }); query(); query({ data: [{ ...dbTx, amount: "9007199254740993" }] });
    await expect(getAnalysisView("owner", "analysis")).rejects.toEqual(new DataError("internal_error"));
  });
  it("잘못된 UUID도 존재하지 않는 분석과 동일하다", async () => {
    query(); query({ error: { code: "22P02" } });
    expect(await getAnalysisView("owner", "invalid-id")).toBeNull();
  });
  it("DB 오류는 내부 원문 없이 전달한다", async () => {
    query(); query({ error: { message: "비공개 원문" } });
    await expect(getAnalysisView("owner", "analysis")).rejects.toEqual(new DataError("internal_error"));
  });
});

describe("인사이트·삭제 데이터 래퍼", () => {
  it("인사이트 조회는 본인 completed 조건과 집계·기존 값만 선택한다", async () => {
    const q = query({ data: row });
    expect(await getAnalysisForInsights("owner", "analysis")).toEqual({ summary, detections: row.detections, insights });
    expect(q.eq.mock.calls).toEqual([["user_id", "owner"], ["id", "analysis"], ["status", "completed"]]);
  });
  it.each(["missing", "foreign", "processing", "failed"])("인사이트 %s 조회는 null이다", async (id) => {
    query();
    expect(await getAnalysisForInsights("owner", id)).toBeNull();
  });
  it("탐지 거래 조회는 본인 분석 거래 중 정기결제·이상거래만 반환한다", async () => {
    const q = query({ data: [dbTx, { ...dbTx, is_recurring: false, anomaly_type: null }] });
    expect(await getFlaggedTransactions("owner", "analysis")).toEqual([{
      occurredOn: "2026-09-30", amount: 12000, direction: "debit", merchant: "상점", category: "food",
      isRecurring: true, anomalyType: "duplicate",
    }]);
    expect(q.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(q.eq).toHaveBeenCalledWith("analysis_id", "analysis");
  });
  it("인사이트 저장은 null인 본인 completed 분석에만 허용하고 저장값을 반환한다", async () => {
    const q = query({ data: { insights } });
    expect(await saveInsights("owner", "analysis", insights)).toEqual(insights);
    expect(q.update).toHaveBeenCalledWith({ insights });
    expect(q.eq.mock.calls).toEqual([["user_id", "owner"], ["id", "analysis"], ["status", "completed"]]);
    expect(q.is).toHaveBeenCalledWith("insights", null);
    expect(mocks.from.mock.calls).toEqual([["analyses"]]);
  });
  it("동시 생성 시 먼저 저장된 인사이트를 덮어쓰지 않고 반환한다", async () => {
    query(); query({ data: row });
    expect(await saveInsights("owner", "analysis", [{ title: "후속", body: "제안", monthlySaving: 0 }])).toEqual(insights);
  });
  it("생성 도중 분석 삭제 시 not_found이며 사용량·상태를 쓰지 않는다", async () => {
    query(); query();
    await expect(saveInsights("owner", "analysis", insights)).rejects.toEqual(new DataError("not_found"));
    expect(mocks.from.mock.calls).toEqual([["analyses"], ["analyses"]]);
  });
  it("삭제용 상태 조회에도 ID·사용자 조건이 있다", async () => {
    const q = query({ data: { status: "failed" } });
    expect(await getAnalysisStatus("owner", "analysis")).toBe("failed");
    expect(q.eq.mock.calls).toEqual([["user_id", "owner"], ["id", "analysis"]]);
  });
  it("DB 삭제는 본인 분석에만 수행하고 처리 중 분석과 원장은 건드리지 않는다", async () => {
    const q = query({ data: { id: "analysis" } });
    expect(await deleteAnalysisRecord("owner", "analysis")).toBe(true);
    expect(q.delete).toHaveBeenCalledTimes(1);
    expect(q.eq.mock.calls).toEqual([["user_id", "owner"], ["id", "analysis"]]);
    expect(q.neq).toHaveBeenCalledWith("status", "processing");
    expect(mocks.from.mock.calls).toEqual([["analyses"]]);
  });
  it.each(["get", "save", "delete"])("%s 오류 원문은 저장·반환하지 않는다", async (operation) => {
    query({ error: { message: "비공개 원문" } });
    await expect(operation === "get" ? getAnalysisForInsights("owner", "analysis")
      : operation === "save" ? saveInsights("owner", "analysis", insights)
      : deleteAnalysisRecord("owner", "analysis")).rejects.toEqual(new DataError("internal_error"));
  });
});
