// @vitest-environment node
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";
import { config, proxy } from "./proxy";

const mocks = vi.hoisted(() => ({ getClaims: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn(() => ({ auth: mocks })) }));
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://dev.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-key");
  mocks.getClaims.mockResolvedValue({ data: null, error: null });
});

it("J1.5 비인증 보호 페이지를 쿼리 없는 로그인으로 이동한다", async () => {
  const response = await proxy(new NextRequest("https://finsight.example/dashboard/analyses/id?redirect=https://evil.com"));
  expect(response.headers.get("location")).toBe("https://finsight.example/login");
  expect(mocks.getClaims).toHaveBeenCalledOnce();
});

it("검증된 사용자의 요청을 통과시킨다", async () => {
  mocks.getClaims.mockResolvedValue({ data: { claims: { sub: "owner" } }, error: null });
  const response = await proxy(new NextRequest("https://finsight.example/settings"));
  expect(response.headers.get("location")).toBeNull();
});

it("claims 오류나 빈 sub를 인증 성공으로 판단하지 않는다", async () => {
  mocks.getClaims.mockResolvedValue({ data: { claims: { sub: "owner" } }, error: { code: "invalid_jwt" } });
  expect((await proxy(new NextRequest("https://finsight.example/dashboard"))).headers.get("location")).toBe("https://finsight.example/login");
  mocks.getClaims.mockResolvedValue({ data: { claims: { sub: "" } }, error: null });
  expect((await proxy(new NextRequest("https://finsight.example/settings"))).headers.get("location")).toBe("https://finsight.example/login");
});

it("세션 갱신 쿠키를 요청·응답에 쓰고 redirect에도 캐시 방지 헤더를 보존한다", async () => {
  mocks.getClaims.mockImplementation(async () => {
    const options = vi.mocked(createServerClient).mock.calls[0][2];
    const cookieAdapter = options.cookies as {
      getAll: () => { name: string; value: string }[];
      setAll: (cookies: { name: string; value: string; options: CookieOptions }[], headers: Record<string, string>) => void;
    };
    expect(cookieAdapter.getAll()).toContainEqual({ name: "old", value: "token" });
    cookieAdapter.setAll([{ name: "refreshed", value: "new-token", options: { path: "/", sameSite: "lax" } }], {
      "Cache-Control": "private, no-store", Expires: "0", Pragma: "no-cache",
    });
    // 후속 setAll에 빈 헤더가 와도 첫 캐시 방지 헤더를 유지한다.
    cookieAdapter.setAll([{ name: "second", value: "value", options: { path: "/" } }], {});
    return { data: null, error: null };
  });
  const request = new NextRequest("https://finsight.example/dashboard", { headers: { cookie: "old=token" } });
  const response = await proxy(request);
  expect(request.cookies.get("refreshed")?.value).toBe("new-token");
  expect(response.cookies.get("refreshed")?.value).toBe("new-token");
  expect(response.cookies.get("second")?.value).toBe("value");
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(response.headers.get("expires")).toBe("0");
  expect(response.headers.get("pragma")).toBe("no-cache");
  expect(vi.mocked(createServerClient).mock.calls[0].slice(0, 2)).toEqual(["https://dev.supabase.co", "public-key"]);
});

it.each(["/_next/static/chunk.js", "/_next/image?url=x", "/favicon.ico", "/logo.svg", "/font.woff2", "/file.csv", "/api/webhooks", "/api/webhooks/polar"])("matcher에서 %s를 제외한다", (url) => {
  expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(false);
});

it.each(["/login", "/auth/confirm?token_hash=token", "/dashboard", "/settings", "/api/analyses"])("matcher에서 %s의 세션을 갱신한다", (url) => {
  expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(true);
});
