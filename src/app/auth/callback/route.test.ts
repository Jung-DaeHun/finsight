// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({ exchangeCodeForSession: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: mocks }) }));
beforeEach(() => { vi.resetAllMocks(); mocks.exchangeCodeForSession.mockResolvedValue({ error: null }); });

it("OAuth code를 교환한 뒤 항상 대시보드로 이동한다", async () => {
  const response = await GET(new NextRequest("https://finsight.example/auth/callback?code=oauth-code&next=https://evil.com"));
  expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("oauth-code");
  expect(response.headers.get("location")).toBe("https://finsight.example/dashboard");
  expect(response.headers.get("cache-control")).toContain("no-store");
});

it.each(["", "?error=access_denied&error_description=private"])("J1.6 OAuth 취소·code 누락 %s는 로그인으로 이동한다", async (query) => {
  const response = await GET(new NextRequest(`https://finsight.example/auth/callback${query}`));
  expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
  expect(response.headers.get("location")).toBe("https://finsight.example/login?error=oauth_failed");
});

it("교환 실패·네트워크 예외는 정해진 오류로 로그인에 복귀한다", async () => {
  mocks.exchangeCodeForSession.mockResolvedValueOnce({ error: { message: "private" } }).mockRejectedValueOnce(new Error("private"));
  for (let i = 0; i < 2; i++) {
    const response = await GET(new NextRequest("https://finsight.example/auth/callback?code=code"));
    expect(response.headers.get("location")).toBe("https://finsight.example/login?error=oauth_failed");
  }
});
