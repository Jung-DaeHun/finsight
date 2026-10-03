// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteAccount, deleteAnalysis } from "./deletion";
import { AccountDeletionError, DataError, StorageDeleteError } from "@/types/errors";

const mocks = vi.hoisted(() => ({
  getAnalysisStatus: vi.fn(), recoverStaleAnalyses: vi.fn(), deleteAnalysisRecord: vi.fn(),
  storageFrom: vi.fn(), list: vi.fn(), remove: vi.fn(), deleteUser: vi.fn(), cancelSubscriptions: vi.fn(), logError: vi.fn(),
}));
vi.mock("@/lib/data", () => mocks);
vi.mock("@/lib/log", () => ({ logError: mocks.logError }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ storage: { from: mocks.storageFrom }, auth: { admin: { deleteUser: mocks.deleteUser } } }) }));
vi.mock("@/services/polar", () => ({ cancelSubscriptions: mocks.cancelSubscriptions }));
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
  mocks.cancelSubscriptions.mockResolvedValue(undefined);
  mocks.deleteUser.mockResolvedValue({ error: null });
});

describe("J7·R1: Polar → Storage → auth 순서의 회원 탈퇴", () => {
  it("로컬 구독 조회 없이 Polar 취소를 호출하고 Storage가 빈 것을 확인한 뒤 auth를 삭제한다", async () => {
    await expect(deleteAccount("owner")).resolves.toBeUndefined();
    expect(mocks.cancelSubscriptions).toHaveBeenCalledWith("owner");
    expect(mocks.getAnalysisStatus).not.toHaveBeenCalled();
    expect(mocks.deleteAnalysisRecord).not.toHaveBeenCalled();
    expect(mocks.list).toHaveBeenCalledWith("owner", { limit: 100, offset: 0, sortBy: { column: "name", order: "asc" } });
    // auth 삭제 전 정리·확인 2회 + auth 삭제 후 재정리·확인 2회
    expect(mocks.list).toHaveBeenCalledTimes(4);
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.deleteUser).toHaveBeenCalledWith("owner");
    expect(mocks.cancelSubscriptions.mock.invocationCallOrder[0]).toBeLessThan(mocks.storageFrom.mock.invocationCallOrder[0]);
    expect(mocks.list.mock.invocationCallOrder[1]).toBeLessThan(mocks.deleteUser.mock.invocationCallOrder[0]);
  });
  it("구독 취소 실패 시 Storage·auth를 호출하지 않고 안전한 코드만 전달한다", async () => {
    mocks.cancelSubscriptions.mockRejectedValue(new Error("비공개 Polar 응답"));
    await expect(deleteAccount("owner")).rejects.toEqual(new AccountDeletionError("subscription_cancel_failed"));
    expect(mocks.storageFrom).not.toHaveBeenCalled();
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
  it("사용자 prefix의 폴더와 내부 파일을 마지막 페이지까지 수집하고 파일만 삭제한다", async () => {
    const first = Array.from({ length: 100 }, (_, i) => file(`upload-${i}`));
    mocks.list.mockResolvedValueOnce(ok([{ name: "analysis-a", id: null }, { name: "analysis-b", id: null }]))
      .mockResolvedValueOnce(ok(first)).mockResolvedValueOnce(ok([file("last")]))
      .mockResolvedValueOnce(ok([file("second")])).mockResolvedValueOnce(ok());
    await deleteAccount("owner");
    // auth 삭제 전 정리 단계의 조회만 본다(이후 재정리 조회는 별도 테스트).
    expect(mocks.list.mock.calls.slice(0, 5).map(([prefix, options]) => [prefix, options.offset])).toEqual([
      ["owner", 0], ["owner/analysis-a", 0], ["owner/analysis-a", 100], ["owner/analysis-b", 0], ["owner", 0],
    ]);
    expect(mocks.list.mock.invocationCallOrder[3]).toBeLessThan(mocks.remove.mock.invocationCallOrder[0]);
    expect(mocks.remove.mock.calls.flatMap(([paths]) => paths)).toEqual([
      ...first.map((f) => `owner/analysis-a/${f.name}`), "owner/analysis-a/last", "owner/analysis-b/second",
    ]);
    expect(mocks.list.mock.invocationCallOrder[4]).toBeLessThan(mocks.deleteUser.mock.invocationCallOrder[0]);
  });
  it("사용자 prefix의 100번째 이후 분석 폴더도 삭제한다", async () => {
    const folders = Array.from({ length: 101 }, (_, i) => ({ name: `analysis-${i}`, id: null }));
    mocks.list.mockImplementation(async (prefix: string, { offset }: { offset: number }) => {
      if (mocks.remove.mock.calls.length) return ok();
      return prefix === "owner" ? ok(folders.slice(offset, offset + 100)) : ok([file("original")]);
    });
    await deleteAccount("owner");
    expect(mocks.list).toHaveBeenCalledWith("owner", expect.objectContaining({ offset: 100 }));
    expect(mocks.remove.mock.calls.flatMap(([paths]) => paths)).toHaveLength(101);
  });
  it.each(["list", "second_page", "remove", "verify", "remaining", "throw"])("Storage %s 실패 시 auth를 보존한다", async (failure) => {
    const error = { data: null, error: { message: "비공개 원본 경로" } };
    if (failure === "list") mocks.list.mockResolvedValueOnce(error);
    if (failure === "second_page") mocks.list.mockResolvedValueOnce(ok(Array.from({ length: 100 }, (_, i) => file(String(i))))).mockResolvedValueOnce(error);
    if (failure === "remove") { mocks.list.mockResolvedValueOnce(ok([file("original")])); mocks.remove.mockResolvedValueOnce(error); }
    if (failure === "verify") mocks.list.mockResolvedValueOnce(ok()).mockResolvedValueOnce(error);
    if (failure === "remaining") mocks.list.mockResolvedValueOnce(ok()).mockResolvedValueOnce(ok([file("late-upload")]));
    if (failure === "throw") mocks.list.mockRejectedValueOnce(new Error("비공개 Storage 응답"));
    await expect(deleteAccount("owner")).rejects.toEqual(new AccountDeletionError("storage_delete_failed"));
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
  it.each(["response", "throw"])("auth %s 실패를 account_delete_failed로 변환한다", async (failure) => {
    if (failure === "response") mocks.deleteUser.mockResolvedValue({ error: { message: "비공개 DB 응답" } });
    else mocks.deleteUser.mockRejectedValue(new Error("비공개 DB 응답"));
    await expect(deleteAccount("owner")).rejects.toEqual(new AccountDeletionError("account_delete_failed"));
  });
  it("Storage 정리 뒤 끼어든 업로드 원본도 auth 삭제 후 다시 지운다", async () => {
    mocks.list.mockResolvedValueOnce(ok()).mockResolvedValueOnce(ok())
      .mockResolvedValueOnce(ok([file("late-upload")])).mockResolvedValueOnce(ok());
    await expect(deleteAccount("owner")).resolves.toBeUndefined();
    expect(mocks.remove).toHaveBeenCalledWith(["owner/late-upload"]);
    expect(mocks.deleteUser.mock.invocationCallOrder[0]).toBeLessThan(mocks.remove.mock.invocationCallOrder[0]);
  });
  it("auth 삭제 후 재정리가 실패해도 탈퇴는 완료하고 코드만 기록한다", async () => {
    mocks.list.mockResolvedValueOnce(ok()).mockResolvedValueOnce(ok()).mockRejectedValueOnce(new Error("비공개 Storage 응답"));
    await expect(deleteAccount("owner")).resolves.toBeUndefined();
    expect(mocks.logError).toHaveBeenCalledWith("account_storage_cleanup_failed", { code: "storage_delete_failed" });
  });
  it("구독·원본이 이미 정리된 상태에서 auth 삭제를 재시도할 수 있다", async () => {
    mocks.list.mockResolvedValueOnce(ok([file("original")])).mockResolvedValueOnce(ok());
    mocks.deleteUser.mockResolvedValueOnce({ error: { message: "일시적 실패" } });
    await expect(deleteAccount("owner")).rejects.toEqual(new AccountDeletionError("account_delete_failed"));
    await expect(deleteAccount("owner")).resolves.toBeUndefined();
    expect(mocks.cancelSubscriptions).toHaveBeenCalledTimes(2);
    expect(mocks.remove).toHaveBeenCalledTimes(1);
    expect(mocks.deleteUser).toHaveBeenCalledTimes(2);
  });
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
