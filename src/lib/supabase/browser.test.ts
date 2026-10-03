import { afterEach, expect, it, vi } from "vitest";
import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "./browser";
vi.mock("@supabase/ssr", () => ({ createBrowserClient: vi.fn() }));
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
it("브라우저 인증에는 publishable key만 전달한다", () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://dev.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-public");
  createClient();
  expect(createBrowserClient).toHaveBeenCalledWith("https://dev.supabase.co", "test-public", { cookieOptions: { sameSite: "lax" } });
});
