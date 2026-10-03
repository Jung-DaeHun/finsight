// @vitest-environment node
import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST, maxDuration, runtime } from "./route";
import { DataError, PipelineError } from "@/types/errors";

const mocks = vi.hoisted(() => ({
  getUserId: vi.fn(), getUserPlan: vi.fn(), findCompletedDuplicate: vi.fn(), startAnalysis: vi.fn(),
  createUpload: vi.fn(), uploadOriginal: vi.fn(), failAnalysis: vi.fn(), runAnalysis: vi.fn(), logError: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ getUserId: mocks.getUserId }));
vi.mock("@/lib/data", () => mocks);
vi.mock("@/services/analysis-pipeline", () => ({ runAnalysis: mocks.runAnalysis }));
vi.mock("@/lib/log", () => ({ logError: mocks.logError }));

function request(files: File[] = [new File(["거래일,가맹점,금액\n2026-09-01,카페,5000"], "원본.csv")], signal?: AbortSignal) {
  const body = new FormData();
  for (const file of files) body.append("files", file);
  body.append("user_id", "attacker");
  return new Request("https://finsight.example/api/analyses", { method: "POST", body, signal });
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUserId.mockResolvedValue("owner");
  mocks.getUserPlan.mockResolvedValue("free");
  mocks.findCompletedDuplicate.mockResolvedValue(false);
  mocks.startAnalysis.mockResolvedValue({ analysisId: "analysis" });
  mocks.createUpload.mockResolvedValue(undefined);
  mocks.uploadOriginal.mockResolvedValue(undefined);
  mocks.failAnalysis.mockResolvedValue(undefined);
  mocks.runAnalysis.mockResolvedValue(undefined);
});
async function expectError(response: Response, status: number, code: string, extra = {}) {
  expect(response.status).toBe(status);
  expect(await response.json()).toEqual({ error: { code, ...extra } });
}

describe("POST /api/analyses", () => {
  it("Node 런타임에서 300초 안에 동기로 처리한다", () => {
    expect(maxDuration).toBe(300);
    expect(runtime).toBe("nodejs");
  });
  it("401: 미인증 사용자는 본문 처리나 DB에 접근하지 않는다", async () => {
    mocks.getUserId.mockResolvedValue(null);
    const req = request();
    const read = vi.spyOn(req, "formData");
    await expectError(await POST(req), 401, "unauthorized");
    expect(read).not.toHaveBeenCalled();
    expect(mocks.getUserPlan).not.toHaveBeenCalled();
  });
  it.each([["free", 0], ["free", 2], ["pro", 4]] as const)("400: %s 파일 %i개는 수 제한을 거부한다", async (plan, count) => {
    mocks.getUserPlan.mockResolvedValue(plan);
    await expectError(await POST(request(Array.from({ length: count }, () => new File(["data"], "a.csv")))), 400, "too_many_files");
    expect(mocks.findCompletedDuplicate).not.toHaveBeenCalled();
    expect(mocks.startAnalysis).not.toHaveBeenCalled();
  });
  it("문자열 files 값은 파일로 간주하지 않는다", async () => {
    const body = new FormData(); body.append("files", "fake-file");
    await expectError(await POST(new Request("https://finsight.example/api/analyses", { method: "POST", body })), 400, "too_many_files");
  });
  it("multipart가 아니거나 파싱할 수 없으면 안전한 400을 반환한다", async () => {
    await expectError(await POST(new Request("https://finsight.example/api/analyses", { method: "POST", body: "invalid" })), 400, "file_unreadable");
    expect(mocks.startAnalysis).not.toHaveBeenCalled();
  });
  it("400: 1MB 초과는 분석 시작 전에 거부한다", async () => {
    await expectError(await POST(request([new File([new Uint8Array(1_048_577)], "large.xlsx")])), 400, "file_too_large");
    expect(mocks.startAnalysis).not.toHaveBeenCalled();
    expect(mocks.findCompletedDuplicate).not.toHaveBeenCalled();
  });
  it("409: 본인 완료 해시 중복이면 분석·업로드를 만들지 않는다", async () => {
    mocks.findCompletedDuplicate.mockResolvedValue(true);
    await expectError(await POST(request()), 409, "duplicate_file");
    expect(mocks.startAnalysis).not.toHaveBeenCalled();
    expect(mocks.createUpload).not.toHaveBeenCalled();
  });
  it("409: 한 요청에 같은 내용의 파일이 여러 개면 이중 집계하지 않도록 거부한다", async () => {
    mocks.getUserPlan.mockResolvedValue("pro");
    await expectError(await POST(request([new File(["same"], "a.csv"), new File(["same"], "b.csv")])), 409, "duplicate_file");
    expect(mocks.startAnalysis).not.toHaveBeenCalled();
  });
  it.each([["monthly_limit", 429], ["analysis_in_progress", 409]] as const)("시작 거부 %s (%i)는 Storage에 저장하지 않는다", async (code, status) => {
    mocks.startAnalysis.mockRejectedValue(new DataError(code));
    await expectError(await POST(request()), status, code);
    expect(mocks.uploadOriginal).not.toHaveBeenCalled();
    expect(mocks.failAnalysis).not.toHaveBeenCalled();
  });
  it("201: SHA256·서버 UUID 경로·기록 후 Storage 저장·분석 완료 순서를 따른다", async () => {
    const source = "거래일,가맹점,금액\n2026-09-01,카페,5000";
    const response = await POST(request([new File([source], "원본.csv")]));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ analysisId: "analysis" });
    expect(mocks.getUserPlan).toHaveBeenCalledWith("owner");
    expect(mocks.findCompletedDuplicate).toHaveBeenCalledWith("owner", [createHash("sha256").update(source).digest("hex")]);
    expect(mocks.startAnalysis).toHaveBeenCalledWith("owner", "free");
    const [userId, analysisId, upload] = mocks.createUpload.mock.calls[0];
    expect(userId).toBe("owner"); expect(analysisId).toBe("analysis");
    expect(upload.uploadId).toMatch(/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/);
    expect(upload).toEqual({ uploadId: upload.uploadId, filename: "원본.csv", storagePath: `owner/analysis/${upload.uploadId}`, fileHash: createHash("sha256").update(source).digest("hex") });
    expect(mocks.uploadOriginal).toHaveBeenCalledWith(upload.storagePath, expect.any(ArrayBuffer));
    expect(mocks.runAnalysis).toHaveBeenCalledWith("owner", "analysis", "free", [{ uploadId: upload.uploadId, bytes: expect.any(ArrayBuffer) }]);
    expect(mocks.createUpload.mock.invocationCallOrder[0]).toBeLessThan(mocks.uploadOriginal.mock.invocationCallOrder[0]);
    expect(mocks.uploadOriginal.mock.invocationCallOrder[0]).toBeLessThan(mocks.runAnalysis.mock.invocationCallOrder[0]);
  });
  it("Pro 3파일은 각각 다른 upload ID로 기록 후 저장하고 한 파이프라인에 넘긴다", async () => {
    mocks.getUserPlan.mockResolvedValue("pro");
    const response = await POST(request([new File(["a"], "a.csv"), new File(["b"], "b.xls"), new File(["c"], "c.xlsx")]));
    expect(response.status).toBe(201);
    expect(mocks.createUpload).toHaveBeenCalledTimes(3);
    expect(mocks.uploadOriginal).toHaveBeenCalledTimes(3);
    const files = mocks.runAnalysis.mock.calls[0][3];
    expect(files).toHaveLength(3);
    expect(new Set(files.map((file: { uploadId: string }) => file.uploadId)).size).toBe(3);
    for (let i = 0; i < 3; i++) expect(mocks.createUpload.mock.invocationCallOrder[i]).toBeLessThan(mocks.uploadOriginal.mock.invocationCallOrder[i]);
  });
  it.each(["mapping_failed", "unsupported_currency", "llm_unavailable", "too_many_rows"] as const)("422: %s는 analysisId와 실패 uploadId만 반환한다", async (code) => {
    mocks.runAnalysis.mockRejectedValue(new PipelineError(code, "failed-upload"));
    await expectError(await POST(request()), 422, code, { analysisId: "analysis", uploadId: "failed-upload" });
    expect(mocks.failAnalysis).not.toHaveBeenCalled();
  });
  it("500: 파이프라인의 internal_error는 파일 오류(422)가 아니라 서버 오류로 반환한다", async () => {
    mocks.runAnalysis.mockRejectedValue(new PipelineError("internal_error"));
    await expectError(await POST(request()), 500, "internal_error", { analysisId: "analysis" });
  });
  it("504: timeout은 이미 생성된 analysisId를 반환한다", async () => {
    mocks.runAnalysis.mockRejectedValue(new PipelineError("timeout"));
    await expectError(await POST(request()), 504, "timeout", { analysisId: "analysis" });
  });
  it("Storage 실패는 기록한 uploadId로 전체 실패하고 파이프라인을 실행하지 않는다", async () => {
    mocks.uploadOriginal.mockRejectedValue(new Error("비공개 Storage 원문"));
    const response = await POST(request());
    const uploadId = mocks.createUpload.mock.calls[0][2].uploadId;
    await expectError(response, 422, "storage_upload_failed", { analysisId: "analysis", uploadId });
    expect(mocks.failAnalysis).toHaveBeenCalledWith("owner", "analysis", { code: "storage_upload_failed", uploadId });
    expect(mocks.runAnalysis).not.toHaveBeenCalled();
    expect(mocks.logError).toHaveBeenCalledWith("analysis_failed", { code: "storage_upload_failed", analysisId: "analysis", durationMs: expect.any(Number) });
  });
  it("원본 파일명은 텍스트로만 저장하고 Storage 경로에는 사용하지 않는다", async () => {
    await POST(request([new File(["data"], "<script>원본</script>.csv")]));
    const upload = mocks.createUpload.mock.calls[0][2];
    expect(upload.filename).toContain("<");
    expect(upload.storagePath).toBe(`owner/analysis/${upload.uploadId}`);
  });
  it("uploads 기록 실패 시 원본을 저장하지 않고 존재하지 않는 uploadId를 실패에 연결하지 않는다", async () => {
    mocks.createUpload.mockRejectedValue(new DataError("internal_error"));
    await expectError(await POST(request()), 500, "internal_error", { analysisId: "analysis" });
    expect(mocks.uploadOriginal).not.toHaveBeenCalled();
    expect(mocks.runAnalysis).not.toHaveBeenCalled();
    expect(mocks.failAnalysis).toHaveBeenCalledWith("owner", "analysis", { code: "internal_error" });
  });
  it("실패 기록까지 DB 오류여도 정해진 Storage 코드와 기록 경로 정보를 유지한다", async () => {
    mocks.uploadOriginal.mockRejectedValue(new Error("비공개 원문"));
    mocks.failAnalysis.mockRejectedValue(new DataError("internal_error"));
    const response = await POST(request());
    const uploadId = mocks.createUpload.mock.calls[0][2].uploadId;
    await expectError(response, 422, "storage_upload_failed", { analysisId: "analysis", uploadId });
  });
  it("2.1: 서버 수신 뒤 연결이 종료돼도 동기 분석을 완료한다", async () => {
    const controller = new AbortController();
    mocks.uploadOriginal.mockImplementation(async () => { controller.abort(); });
    const response = await POST(request(undefined, controller.signal));
    expect(controller.signal.aborted).toBe(true);
    expect(response.status).toBe(201);
    expect(mocks.runAnalysis).toHaveBeenCalledTimes(1);
  });
  it("알 수 없는 서버 예외는 원문 없이 500 코드로 반환한다", async () => {
    mocks.getUserPlan.mockRejectedValue(new Error("시크릿 원문"));
    await expectError(await POST(request()), 500, "internal_error");
    expect(mocks.logError).toHaveBeenCalledWith("analysis_failed", { code: "internal_error", durationMs: expect.any(Number) });
  });
});
