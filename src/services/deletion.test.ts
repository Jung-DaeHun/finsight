// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteAnalysis } from "./deletion";
import { DataError, StorageDeleteError } from "@/types/errors";

const mocks = vi.hoisted(() => ({
  getAnalysisStatus: vi.fn(), recoverStaleAnalyses: vi.fn(), deleteAnalysisRecord: vi.fn(),
  storageFrom: vi.fn(), list: vi.fn(), remove: vi.fn(),
}));
vi.mock("@/lib/data", () => mocks);
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ storage: { from: mocks.storageFrom } }) }));
const file = (name: string) => ({ name, id: name, metadata: { size: 1 } });
const ok = (data: unknown[] = []) => ({ data, error: null });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getAnalysisStatus.mockResolvedValue("completed");
  mocks.recoverStaleAnalyses.mockResolvedValue(undefined);
  mocks.deleteAnalysisRecord.mockResolvedValue(true);
  mocks.storageFrom.mockReturnValue({ list: mocks.list, remove: mocks.remove });
  mocks.list.mockResolvedValue(ok());
  mocks.remove.mockResolvedValue(ok());
});

describe("R1: 원본 삭제 확인 후 분석 삭제", () => {
  it.each(["foreign", "missing"])("%s 분석은 소유권 확인에서 중단한다", async (id) => {
    mocks.getAnalysisStatus.mockResolvedValue(null);
    expect(await deleteAnalysis("owner", id)).toBe("not_found");
    expect(mocks.getAnalysisStatus).toHaveBeenCalledWith("owner", id);
    expect(mocks.recoverStaleAnalyses).not.toHaveBeenCalled();
    expect(mocks.storageFrom).not.toHaveBeenCalled();
    expect(mocks.deleteAnalysisRecord).not.toHaveBeenCalled();
  });
  it("processing은 복구 이후에도 처리 중이면 삭제하지 않는다", async () => {
    mocks.getAnalysisStatus.mockResolvedValue("processing");
    expect(await deleteAnalysis("owner", "analysis")).toBe("in_progress");
    expect(mocks.recoverStaleAnalyses).toHaveBeenCalledWith("owner");
    expect(mocks.storageFrom).not.toHaveBeenCalled();
    expect(mocks.deleteAnalysisRecord).not.toHaveBeenCalled();
  });
  it("6분 넘은 processing은 복구된 failed 상태로 삭제할 수 있다", async () => {
    mocks.getAnalysisStatus.mockResolvedValueOnce("processing").mockResolvedValueOnce("failed");
    expect(await deleteAnalysis("owner", "analysis")).toBe("deleted");
    expect(mocks.getAnalysisStatus.mock.invocationCallOrder[0]).toBeLessThan(mocks.recoverStaleAnalyses.mock.invocationCallOrder[0]);
    expect(mocks.recoverStaleAnalyses.mock.invocationCallOrder[0]).toBeLessThan(mocks.getAnalysisStatus.mock.invocationCallOrder[1]);
  });
  it("소유권 조회 후 다른 요청이 삭제한 분석도 not_found로 처리한다", async () => {
    mocks.getAnalysisStatus.mockResolvedValueOnce("completed").mockResolvedValueOnce(null);
    expect(await deleteAnalysis("owner", "analysis")).toBe("not_found");
    expect(mocks.storageFrom).not.toHaveBeenCalled();
  });
  it("2페이지 파일을 모두 수집하고 파일 경로로 삭제·검증한 뒤 DB를 삭제한다", async () => {
    const first = Array.from({ length: 100 }, (_, i) => file(`upload-${i}`));
    mocks.list.mockResolvedValueOnce(ok(first)).mockResolvedValueOnce(ok([file("last")])).mockResolvedValueOnce(ok());
    expect(await deleteAnalysis("owner", "analysis")).toBe("deleted");
    expect(mocks.storageFrom).toHaveBeenCalledWith("csv-uploads");
    expect(mocks.list.mock.calls).toEqual([
      ["owner/analysis", { limit: 100, offset: 0, sortBy: { column: "name", order: "asc" } }],
      ["owner/analysis", { limit: 100, offset: 100, sortBy: { column: "name", order: "asc" } }],
      ["owner/analysis", { limit: 100, offset: 0, sortBy: { column: "name", order: "asc" } }],
    ]);
    expect(mocks.list.mock.invocationCallOrder[1]).toBeLessThan(mocks.remove.mock.invocationCallOrder[0]);
    expect(mocks.remove.mock.calls.flatMap(([paths]) => paths)).toEqual([
      ...first.map((f) => `owner/analysis/${f.name}`), "owner/analysis/last",
    ]);
    expect(mocks.list.mock.invocationCallOrder[2]).toBeLessThan(mocks.deleteAnalysisRecord.mock.invocationCallOrder[0]);
    expect(mocks.deleteAnalysisRecord).toHaveBeenCalledWith("owner", "analysis");
  });
  it("폴더는 재귀 조회하고 폴더명 대신 내부 파일만 삭제한다", async () => {
    mocks.list.mockResolvedValueOnce(ok([{ name: "nested", id: null, metadata: null }]))
      .mockResolvedValueOnce(ok([file("original")])).mockResolvedValueOnce(ok());
    expect(await deleteAnalysis("owner", "analysis")).toBe("deleted");
    expect(mocks.list).toHaveBeenCalledWith("owner/analysis/nested", expect.any(Object));
    expect(mocks.remove).toHaveBeenCalledWith(["owner/analysis/nested/original"]);
  });
  it("이미 없는 원본은 두 번 확인 후 DB를 삭제한다", async () => {
    expect(await deleteAnalysis("owner", "analysis")).toBe("deleted");
    expect(mocks.list).toHaveBeenCalledTimes(2);
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.deleteAnalysisRecord).toHaveBeenCalledTimes(1);
  });
  it.each(["list", "second_page", "remove", "verify", "remaining", "throw"])("Storage %s 실패 시 DB를 보존하고 원문 없는 에러를 던진다", async (failure) => {
    const error = { data: null, error: { message: "비공개 Storage 오류" } };
    if (failure === "list") mocks.list.mockResolvedValueOnce(error);
    if (failure === "second_page") mocks.list.mockResolvedValueOnce(ok(Array.from({ length: 100 }, (_, i) => file(String(i))))).mockResolvedValueOnce(error);
    if (failure === "remove") { mocks.list.mockResolvedValueOnce(ok([file("original")])); mocks.remove.mockResolvedValueOnce(error); }
    if (failure === "verify") mocks.list.mockResolvedValueOnce(ok()).mockResolvedValueOnce(error);
    if (failure === "remaining") mocks.list.mockResolvedValueOnce(ok([file("original")])).mockResolvedValueOnce(ok([file("original")]));
    if (failure === "throw") mocks.list.mockRejectedValueOnce(new Error("비공개 네트워크 오류"));
    await expect(deleteAnalysis("owner", "analysis")).rejects.toEqual(new StorageDeleteError());
    expect(mocks.deleteAnalysisRecord).not.toHaveBeenCalled();
  });
  it("Storage 실패 후 같은 계정·경로로 재시도하면 완료한다", async () => {
    mocks.list.mockResolvedValueOnce(ok([file("original")]));
    mocks.remove.mockResolvedValueOnce({ error: { message: "실패" } });
    await expect(deleteAnalysis("owner", "analysis")).rejects.toBeInstanceOf(StorageDeleteError);
    mocks.list.mockResolvedValueOnce(ok([file("original")])).mockResolvedValueOnce(ok());
    expect(await deleteAnalysis("owner", "analysis")).toBe("deleted");
    expect(mocks.deleteAnalysisRecord).toHaveBeenCalledTimes(1);
  });
  it("DB 오류를 Storage 오류로 바꾸지 않는다", async () => {
    mocks.deleteAnalysisRecord.mockRejectedValue(new DataError("internal_error"));
    await expect(deleteAnalysis("owner", "analysis")).rejects.toEqual(new DataError("internal_error"));
  });
});
