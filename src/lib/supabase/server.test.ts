// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "./server";
const mocks = vi.hoisted(() => ({ getAll: vi.fn(() => [{ name: "auth", value: "value" }]), set: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => mocks }));
vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }));
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
it("서버 인증 클라이언트에 publishable key와 Next 쿠키 읽기·쓰기를 연결한다", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://dev.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-public");
  await createClient();
  const [url, key, options] = vi.mocked(createServerClient).mock.calls[0];
  expect([url, key]).toEqual(["https://dev.supabase.co", "test-public"]);
  expect(options.cookieOptions).toMatchObject({ sameSite: "lax" });
  const cookies = options.cookies as { getAll: () => unknown; setAll: (cookies: { name: string; value: string; options: object }[]) => void };
  expect(cookies.getAll()).toEqual([{ name: "auth", value: "value" }]);
  cookies.setAll([{ name: "auth", value: "new", options: { path: "/" } }]);
  expect(mocks.set).toHaveBeenCalledWith("auth", "new", { path: "/" });
  mocks.set.mockImplementationOnce(() => { throw new Error("읽기 전용 Server Component"); });
  expect(() => cookies.setAll([{ name: "auth", value: "new", options: {} }])).not.toThrow();
});
