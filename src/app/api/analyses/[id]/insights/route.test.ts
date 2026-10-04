// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST, maxDuration } from "./route";
import { ClaudeServiceError } from "@/services/claude-errors";
import { DataError } from "@/types/errors";

const mocks = vi.hoisted(() => ({
  getUserId: vi.fn(), getAnalysisForInsights: vi.fn(), getUserPlan: vi.fn(), getCompletedHistory: vi.fn(), getFlaggedTransactions: vi.fn(),
  saveInsights: vi.fn(), generateInsights: vi.fn(), logError: vi.fn(), failAnalysis: vi.fn(), completeAnalysis: vi.fn(),
}));
vi.mock("@/lib/auth", () => mocks);
vi.mock("@/lib/data", () => mocks);
vi.mock("@/services/claude", () => mocks);
vi.mock("@/lib/log", () => mocks);
const insights = [{ title: "제안", body: "지출을 확인하세요", monthlySaving: 1000 }];
const input = {
  summary: { totalSpend: 12000, byCategory: { food: 12000 }, topMerchants: [], period: { from: "2026-09-30", to: "2026-09-30" }, transactionCount: 1, skippedRows: 0 },
  detections: { recurringCount: 1, anomalyCount: 0 }, insights: null,
};
const flagged = [{ occurredOn: "2026-09-30", merchant: "넷플릭스", amount: 17000, direction: "debit", category: "subscription", isRecurring: true, anomalyType: null }];
const request = new Request("https://finsight.test/api/analyses/analysis/insights", { method: "POST" });
const context = (id = "analysis") => ({ params: Promise.resolve({ id }) });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUserId.mockResolvedValue("owner");
  mocks.getAnalysisForInsights.mockResolvedValue(input);
  mocks.getUserPlan.mockResolvedValue("pro");
  mocks.getCompletedHistory.mockResolvedValue([]);
  mocks.getFlaggedTransactions.mockResolvedValue(flagged);
  mocks.generateInsights.mockResolvedValue(insights);
  mocks.saveInsights.mockResolvedValue(insights);
});
describe("POST /api/analyses/[id]/insights", () => {
  it("401이면 분석을 조회하지 않는다", async () => {
    mocks.getUserId.mockResolvedValue(null);
    const response = await POST(request, context());
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: { code: "unauthorized" } });
    expect(mocks.getAnalysisForInsights).not.toHaveBeenCalled();
  });
  it.each(["foreign", "missing", "processing", "failed"])("%s는 플랜 검사 전에 404이다", async (id) => {
    mocks.getAnalysisForInsights.mockResolvedValue(null);
    mocks.getUserPlan.mockResolvedValue("free");
    const response = await POST(request, context(id));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: { code: "not_found" } });
    expect(mocks.getAnalysisForInsights).toHaveBeenCalledWith("owner", id);
    expect(mocks.getUserPlan).not.toHaveBeenCalled();
    expect(mocks.generateInsights).not.toHaveBeenCalled();
  });
  it("Free는 기존 인사이트가 있어도 403이며 생성·저장하지 않는다", async () => {
    mocks.getUserPlan.mockResolvedValue("free");
    mocks.getAnalysisForInsights.mockResolvedValue({ ...input, insights });
    const response = await POST(request, context());
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: { code: "pro_required" } });
    expect(mocks.generateInsights).not.toHaveBeenCalled();
    expect(mocks.saveInsights).not.toHaveBeenCalled();
  });
  it.each([insights, []])("기존 인사이트는 그대로 재사용한다 (%j)", async (cached) => {
    mocks.getAnalysisForInsights.mockResolvedValue({ ...input, insights: cached });
    const response = await POST(request, context());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ insights: cached });
    expect(mocks.generateInsights).not.toHaveBeenCalled();
    expect(mocks.saveInsights).not.toHaveBeenCalled();
    expect(mocks.getCompletedHistory).not.toHaveBeenCalled();
    expect(mocks.getFlaggedTransactions).not.toHaveBeenCalled();
  });
  it("본인 완료 이력의 추이·집계와 이 분석의 탐지 거래로 생성하고 저장한 값만 응답한다", async () => {
    const saved = [{ ...insights[0], title: "먼저 저장된 제안" }];
    mocks.saveInsights.mockResolvedValue(saved);
    const response = await POST(request, context());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ insights: saved });
    expect(mocks.getCompletedHistory).toHaveBeenCalledWith("owner");
    expect(mocks.getFlaggedTransactions).toHaveBeenCalledWith("owner", "analysis");
    expect(mocks.generateInsights).toHaveBeenCalledWith({ summary: input.summary, detections: input.detections, trend: { points: [], comparison: null }, flagged });
    expect(mocks.saveInsights).toHaveBeenCalledWith("owner", "analysis", insights);
    expect(mocks.getAnalysisForInsights.mock.invocationCallOrder[0]).toBeLessThan(mocks.getUserPlan.mock.invocationCallOrder[0]);
    expect(maxDuration).toBe(300);
  });
  it.each([
    [new ClaudeServiceError("timeout"), 504, "timeout"],
    [new ClaudeServiceError("llm_unavailable"), 500, "internal_error"],
    [new Error("비공개 원문"), 500, "internal_error"],
  ])("생성 실패 (%s)는 상태·사용량을 바꾸지 않는다", async (error, status, code) => {
    mocks.generateInsights.mockRejectedValue(error);
    const response = await POST(request, context());
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: { code } });
    expect(mocks.saveInsights).not.toHaveBeenCalled();
    expect(mocks.failAnalysis).not.toHaveBeenCalled();
    expect(mocks.completeAnalysis).not.toHaveBeenCalled();
    expect(mocks.logError).toHaveBeenCalledWith("insights_failed", { code, analysisId: "analysis", durationMs: expect.any(Number) });
  });
  it("저장 실패는 500이며 완료된 분석 상태·사용량을 바꾸지 않는다", async () => {
    mocks.saveInsights.mockRejectedValue(new DataError("internal_error"));
    const response = await POST(request, context());
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: { code: "internal_error" } });
    expect(mocks.failAnalysis).not.toHaveBeenCalled();
    expect(mocks.completeAnalysis).not.toHaveBeenCalled();
  });
  it("인사이트 생성 중 분석이 삭제되면 404이다", async () => {
    mocks.saveInsights.mockRejectedValue(new DataError("not_found"));
    const response = await POST(request, context());
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: { code: "not_found" } });
  });
});
