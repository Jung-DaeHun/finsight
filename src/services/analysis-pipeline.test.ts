// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runAnalysis } from "./analysis-pipeline";
import { DataError, PipelineError } from "@/types/errors";
import { SheetError } from "@/lib/sheet/errors";
import { ClaudeServiceError } from "./claude-errors";
import { detect, summarize } from "@/lib/analysis";
import type { ColumnMapping, Transaction } from "@/types";

const mocks = vi.hoisted(() => ({
  mapColumns: vi.fn(), classifyMerchants: vi.fn(), setUploadMapping: vi.fn(),
  getCompletedHistory: vi.fn(), completeAnalysis: vi.fn(), failAnalysis: vi.fn(), logError: vi.fn(),
}));
vi.mock("@/lib/data", () => mocks);
vi.mock("./claude", () => mocks);
vi.mock("@/lib/log", () => ({ logError: mocks.logError }));

const mapping: ColumnMapping = {
  isTransactions: true, isKrw: true, headerRowIndex: 0,
  dateColumn: "거래일", dateFormat: "YYYY-MM-DD", merchantColumn: "가맹점",
  amount: { mode: "single", column: "금액", debitIsNegative: false },
};
function file(uploadId: string, rows = "2026-09-01,카페,5000") {
  return { uploadId, bytes: new TextEncoder().encode(`거래일,가맹점,금액\n${rows}`).buffer };
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.mapColumns.mockResolvedValue(mapping);
  mocks.classifyMerchants.mockResolvedValue({ 카페: "cafe" });
  mocks.getCompletedHistory.mockResolvedValue([]);
  mocks.completeAnalysis.mockResolvedValue(true);
  mocks.failAnalysis.mockResolvedValue(undefined);
});

describe("동기 분석 파이프라인", () => {
  it.each(["free", "pro"] as const)("%s도 탐지·요약을 코드로 계산해 완료 RPC 한 번에 저장한다", async (plan) => {
    const history: Transaction[] = [{
      occurredOn: "2026-08-01", amount: 5000, direction: "debit", merchant: "카페",
      category: "cafe", isRecurring: false, anomalyType: null,
    }];
    mocks.getCompletedHistory.mockResolvedValue(history);
    await runAnalysis("owner", "analysis", plan, [file("upload", "2026-09-01,카페,5000\n2026-09-01,카페,5000\n2026-09-02,카페,-1000\n2026-09-03,카페,0")]);
    expect(mocks.classifyMerchants).toHaveBeenCalledWith(["카페"], plan);
    expect(mocks.getCompletedHistory).toHaveBeenCalledWith("owner", "analysis");
    const result = mocks.completeAnalysis.mock.calls[0][2];
    expect(result.summary).toEqual({ ...summarize(result.transactions), skippedRows: 1 });
    expect(result.summary.totalSpend).toBe(9000);
    expect(result.transactions).toEqual(detect(result.transactions, history));
    expect(result.detections).toEqual({ recurringCount: 2, anomalyCount: 2 });
    expect(mocks.completeAnalysis).toHaveBeenCalledTimes(1);
    expect(mocks.failAnalysis).not.toHaveBeenCalled();
    expect(mocks.logError).not.toHaveBeenCalled();
    expect(mocks.setUploadMapping).toHaveBeenCalledWith("owner", "upload", { rowCount: 5, columnMapping: mapping });
  });
  it("제목·빈 행을 그대로 둔 상위 15행만 매핑에 보내 실제 헤더 위치를 유지한다", async () => {
    mocks.mapColumns.mockResolvedValue({ ...mapping, headerRowIndex: 2 });
    const rows = ["2026년 명세서", "", "거래일,가맹점,금액", ...Array.from({ length: 20 }, () => "2026-09-01,카페,5000")];
    const bytes = new TextEncoder().encode(rows.join("\n")).buffer;
    await runAnalysis("owner", "analysis", "free", [{ uploadId: "upload", bytes }]);
    const [header, sample, plan] = mocks.mapColumns.mock.calls[0];
    expect(header[0]).toBe("2026년 명세서");
    expect(sample).toHaveLength(14);
    expect(sample[0].every((cell: string) => cell === "")).toBe(true);
    expect(sample[1]).toEqual(["거래일", "가맹점", "금액"]);
    expect(plan).toBe("free");
  });
  it("3파일 거래와 제외 행을 모두 합쳐 한 번만 완료한다", async () => {
    await runAnalysis("owner", "analysis", "pro", [file("a"), file("b", "2026-09-02,카페,3000\n2026-09-03,카페,0"), file("c", "2026-09-04,카페,2000\n2026-09-05,카페,0")]);
    const result = mocks.completeAnalysis.mock.calls[0][2];
    expect(result.transactions).toHaveLength(3);
    expect(result.summary).toEqual({ ...summarize(result.transactions), skippedRows: 2 });
    expect(result.summary.totalSpend).toBe(10000);
    expect(mocks.completeAnalysis).toHaveBeenCalledTimes(1);
  });
  it("5.1: 3개 중 두 번째 파일이 실패하면 해당 uploadId로 전체 실패하며 거래를 저장하지 않는다", async () => {
    mocks.mapColumns.mockResolvedValueOnce(mapping).mockRejectedValueOnce(new ClaudeServiceError("mapping_failed"));
    await expect(runAnalysis("owner", "analysis", "pro", [file("a"), file("b"), file("c")]))
      .rejects.toEqual(new PipelineError("mapping_failed", "b"));
    expect(mocks.failAnalysis).toHaveBeenCalledWith("owner", "analysis", { code: "mapping_failed", uploadId: "b" });
    expect(mocks.mapColumns).toHaveBeenCalledTimes(2);
    expect(mocks.getCompletedHistory).not.toHaveBeenCalled();
    expect(mocks.completeAnalysis).not.toHaveBeenCalled();
  });
  it.each([
    ["not_transactions", { isTransactions: false }],
    ["unsupported_currency", { isKrw: false }],
  ] as const)("%s 매핑은 정규화·분류·완료 전에 파일 실패 처리한다", async (code, change) => {
    mocks.mapColumns.mockResolvedValue({ ...mapping, ...change });
    await expect(runAnalysis("owner", "analysis", "free", [file("upload")])).rejects.toMatchObject({ code, uploadId: "upload" });
    expect(mocks.failAnalysis).toHaveBeenCalledWith("owner", "analysis", { code, uploadId: "upload" });
    expect(mocks.classifyMerchants).not.toHaveBeenCalled();
    expect(mocks.completeAnalysis).not.toHaveBeenCalled();
  });
  it("잘못된 날짜 행이 과다하면 파서 코드를 유지하고 거래를 저장하지 않는다", async () => {
    await expect(runAnalysis("owner", "analysis", "free", [file("upload", "잘못된날짜,카페,5000")]))
      .rejects.toMatchObject({ code: "too_many_invalid_rows", uploadId: "upload" });
    expect(mocks.completeAnalysis).not.toHaveBeenCalled();
  });
  it("빈 원본은 파일 코드와 해당 ID로 실패하고 Claude를 호출하지 않는다", async () => {
    await expect(runAnalysis("owner", "analysis", "free", [{ uploadId: "empty", bytes: new ArrayBuffer(0) }]))
      .rejects.toEqual(new PipelineError(new SheetError("file_unreadable").code, "empty"));
    expect(mocks.mapColumns).not.toHaveBeenCalled();
    expect(mocks.completeAnalysis).not.toHaveBeenCalled();
  });
  it("분류의 Claude 장애에도 해당 파일 ID를 기록한다", async () => {
    mocks.classifyMerchants.mockRejectedValue(new ClaudeServiceError("llm_unavailable"));
    await expect(runAnalysis("owner", "analysis", "free", [file("upload")]))
      .rejects.toEqual(new PipelineError("llm_unavailable", "upload"));
    expect(mocks.completeAnalysis).not.toHaveBeenCalled();
  });
  it("R5: completeAnalysis false는 파일 ID 없는 timeout이며 재저장하지 않는다", async () => {
    mocks.completeAnalysis.mockResolvedValue(false);
    await expect(runAnalysis("owner", "analysis", "free", [file("upload")])).rejects.toEqual(new PipelineError("timeout"));
    expect(mocks.failAnalysis).toHaveBeenCalledWith("owner", "analysis", { code: "timeout" });
    expect(mocks.completeAnalysis).toHaveBeenCalledTimes(1);
  });
  it("예외 원문·거래·가맹점·파일 ID는 로그와 오류에 포함하지 않는다", async () => {
    mocks.mapColumns.mockRejectedValue(new Error("민감한 파일 내용: 카페"));
    await expect(runAnalysis("owner", "analysis", "free", [file("upload")])).rejects.toEqual(new PipelineError("internal_error"));
    expect(mocks.logError).toHaveBeenCalledWith("analysis_failed", { code: "internal_error", analysisId: "analysis", durationMs: expect.any(Number) });
    expect(mocks.logError).toHaveBeenCalledTimes(1);
  });
  it.each(["setUploadMapping", "getCompletedHistory", "completeAnalysis"] as const)(
    "%s의 DB 오류는 파일 문제가 아니므로 uploadId 없는 internal_error로 기록한다", async (name) => {
      mocks[name].mockRejectedValue(new DataError("internal_error"));
      await expect(runAnalysis("owner", "analysis", "free", [file("upload")])).rejects.toEqual(new PipelineError("internal_error"));
      expect(mocks.failAnalysis).toHaveBeenCalledWith("owner", "analysis", { code: "internal_error" });
    },
  );
  it("실패 상태 기록까지 DB가 끊겨도 원문 없이 PipelineError를 반환한다", async () => {
    mocks.mapColumns.mockRejectedValue(new ClaudeServiceError("timeout"));
    mocks.failAnalysis.mockRejectedValue(new Error("민감한 DB 오류"));
    await expect(runAnalysis("owner", "analysis", "free", [file("upload")])).rejects.toEqual(new PipelineError("timeout", "upload"));
    expect(mocks.completeAnalysis).not.toHaveBeenCalled();
    expect(mocks.logError).toHaveBeenCalledTimes(1);
  });
});
