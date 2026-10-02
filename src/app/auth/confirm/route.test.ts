// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({ verifyOtp: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: mocks }) }));
beforeEach(() => { vi.resetAllMocks(); mocks.verifyOtp.mockResolvedValue({ error: null }); });

it("J1 다른 기기의 token_hash 링크를 PKCE code 없이 검증한다", async () => {
  const response = await GET(new NextRequest("https://finsight.example/auth/confirm?token_hash=token&type=signup"));
  expect(mocks.verifyOtp).toHaveBeenCalledWith({ token_hash: "token", type: "signup" });
  expect(response.headers.get("location")).toBe("https://finsight.example/dashboard");
  expect(response.headers.get("cache-control")).toContain("no-store");
});

it("J1.3 recovery 확인 후 비밀번호 폼으로 이동한다", async () => {
  const response = await GET(new NextRequest("https://finsight.example/auth/confirm?token_hash=token&type=recovery&next=/reset-password"));
  expect(mocks.verifyOtp).toHaveBeenCalledWith({ token_hash: "token", type: "recovery" });
  expect(response.headers.get("location")).toBe("https://finsight.example/reset-password");
});

it.each(["https://evil.com", "//evil.com", "/\\evil.com", "/settings"])("next=%s에서 외부·비허용 경로로 이동하지 않는다", async (next) => {
  const url = new URL("https://finsight.example/auth/confirm?token_hash=token&type=email");
  url.searchParams.set("next", next);
  expect((await GET(new NextRequest(url))).headers.get("location")).toBe("https://finsight.example/dashboard");
});

it.each(["", "?token_hash=token", "?type=signup", "?token_hash=token&type=sms"])("누락되거나 잘못된 토큰 형식 %s를 거부한다", async (query) => {
  const response = await GET(new NextRequest(`https://finsight.example/auth/confirm${query}`));
  expect(mocks.verifyOtp).not.toHaveBeenCalled();
  expect(response.headers.get("location")).toBe("https://finsight.example/login?error=auth_link_expired");
});

it("만료·검증 실패 시 오류 원문 대신 정해진 코드를 전달한다", async () => {
  mocks.verifyOtp.mockResolvedValue({ error: { message: "private token" } });
  const response = await GET(new NextRequest("https://finsight.example/auth/confirm?token_hash=token&type=signup"));
  expect(response.headers.get("location")).toBe("https://finsight.example/login?error=auth_link_expired");
});
