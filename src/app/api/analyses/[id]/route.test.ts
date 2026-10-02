// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "./route";
import { DataError, StorageDeleteError } from "@/types/errors";

const mocks = vi.hoisted(() => ({ getUserId: vi.fn(), deleteAnalysis: vi.fn(), logError: vi.fn() }));
vi.mock("@/lib/auth", () => mocks);
vi.mock("@/services/deletion", () => mocks);
vi.mock("@/lib/log", () => mocks);
const request = new Request("https://finsight.test/api/analyses/analysis", { method: "DELETE" });
const context = (id = "analysis") => ({ params: Promise.resolve({ id }) });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUserId.mockResolvedValue("owner");
  mocks.deleteAnalysis.mockResolvedValue("deleted");
});
describe("DELETE /api/analyses/[id]", () => {
  it("인증되지 않았으면 401이며 삭제하지 않는다", async () => {
    mocks.getUserId.mockResolvedValue(null);
    const response = await DELETE(request, context());
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: { code: "unauthorized" } });
    expect(mocks.deleteAnalysis).not.toHaveBeenCalled();
  });
  it("인증 ID와 Promise params로 삭제하고 빈 204를 반환한다", async () => {
    const response = await DELETE(request, context());
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(mocks.deleteAnalysis).toHaveBeenCalledWith("owner", "analysis");
  });
  it.each(["foreign", "missing"])("%s ID는 동일한 404이다", async (id) => {
    mocks.deleteAnalysis.mockResolvedValue("not_found");
    const response = await DELETE(request, context(id));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: { code: "not_found" } });
  });
  it("processing이면 409이다", async () => {
    mocks.deleteAnalysis.mockResolvedValue("in_progress");
    const response = await DELETE(request, context());
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: { code: "analysis_in_progress" } });
  });
  it.each([
    [new StorageDeleteError(), 502, "storage_delete_failed"],
    [new DataError("internal_error"), 500, "internal_error"],
    [new Error("비공개 원문"), 500, "internal_error"],
  ])("서비스 실패는 지정된 코드로 반환한다 (%s)", async (error, status, code) => {
    mocks.deleteAnalysis.mockRejectedValue(error);
    const response = await DELETE(request, context());
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: { code } });
    expect(mocks.logError).toHaveBeenCalledWith("analysis_delete_failed", { code, analysisId: "analysis", durationMs: expect.any(Number) });
  });
});
