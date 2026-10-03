// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "./route";
import { AccountDeletionError } from "@/types/errors";

const mocks = vi.hoisted(() => ({ getUserId: vi.fn(), deleteAccount: vi.fn(), signOut: vi.fn(), logError: vi.fn(), getAll: vi.fn(), setCookie: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getUserId: mocks.getUserId }));
vi.mock("@/services/deletion", () => ({ deleteAccount: mocks.deleteAccount }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { signOut: mocks.signOut } }) }));
vi.mock("@/lib/log", () => ({ logError: mocks.logError }));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: mocks.getAll, set: mocks.setCookie }) }));
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://dev.supabase.co");
  mocks.getUserId.mockResolvedValue("owner");
  mocks.deleteAccount.mockResolvedValue(undefined);
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.getAll.mockReturnValue(["sb-dev-auth-token.0", "sb-dev-auth-token.1", "sb-dev-auth-token-code-verifier", "unrelated", "sb-other-auth-token"].map((name) => ({ name, value: "private" })));
});
afterEach(() => vi.unstubAllEnvs());
describe("DELETE /api/account", () => {
  it("401이면 삭제와 로그아웃을 호출하지 않는다", async () => {
    mocks.getUserId.mockResolvedValue(null);
    const response = await DELETE();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: { code: "unauthorized" } });
    expect(mocks.deleteAccount).not.toHaveBeenCalled();
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.setCookie).not.toHaveBeenCalled();
  });
  it("claims의 본인 ID로 삭제 후 signOut으로 세션을 정리하고 빈 204를 반환한다", async () => {
    const response = await DELETE();
    expect(mocks.deleteAccount).toHaveBeenCalledWith("owner");
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(mocks.deleteAccount.mock.invocationCallOrder[0]).toBeLessThan(mocks.signOut.mock.invocationCallOrder[0]);
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(mocks.setCookie.mock.calls).toEqual([
      ["sb-dev-auth-token.0", "", { path: "/", maxAge: 0 }],
      ["sb-dev-auth-token.1", "", { path: "/", maxAge: 0 }],
      ["sb-dev-auth-token-code-verifier", "", { path: "/", maxAge: 0 }],
    ]);
  });
  it.each(["subscription_cancel_failed", "storage_delete_failed", "account_delete_failed"] as const)("%s는 502이며 세션을 보존한다", async (code) => {
    mocks.deleteAccount.mockRejectedValue(new AccountDeletionError(code));
    const response = await DELETE();
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: { code } });
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.setCookie).not.toHaveBeenCalled();
    expect(mocks.logError).toHaveBeenCalledWith("account_delete_failed", { code, durationMs: expect.any(Number) });
  });
  it("알 수 없는 오류 원문을 응답·로그에 포함하지 않는다", async () => {
    mocks.deleteAccount.mockRejectedValue(new Error("비공개 오류"));
    const response = await DELETE();
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: { code: "account_delete_failed" } });
    expect(mocks.logError).toHaveBeenCalledWith("account_delete_failed", { code: "account_delete_failed", durationMs: expect.any(Number) });
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
  it("계정 삭제 후 signOut의 원격 오류는 완료된 탈퇴를 실패로 바꾸지 않는다", async () => {
    mocks.signOut.mockResolvedValue({ error: { message: "이미 삭제된 계정" } });
    expect((await DELETE()).status).toBe(204);
    expect(mocks.logError).toHaveBeenCalledWith("account_signout_failed", { code: "internal_error" });
    expect(mocks.setCookie).toHaveBeenCalledTimes(3);
  });
  it("계정 삭제 후 signOut이 예외를 던져도 쿠키를 지우고 완료를 반환한다", async () => {
    mocks.signOut.mockRejectedValue(new Error("비공개 네트워크 응답"));
    expect((await DELETE()).status).toBe(204);
    expect(mocks.setCookie).toHaveBeenCalledTimes(3);
    expect(mocks.logError).toHaveBeenCalledWith("account_signout_failed", { code: "internal_error" });
  });
});
