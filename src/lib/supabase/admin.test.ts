// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "./admin";
vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }));
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
it("admin 클라이언트는 secret key를 쓰고 세션을 저장하거나 갱신하지 않는다", () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://dev.supabase.co");
  vi.stubEnv("SUPABASE_SECRET_KEY", "test-secret");
  createAdminClient();
  expect(createClient).toHaveBeenCalledWith("https://dev.supabase.co", "test-secret", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
});
it("secret key가 없으면 클라이언트를 만들지 않는다", () => {
  vi.stubEnv("SUPABASE_SECRET_KEY", "");
  expect(() => createAdminClient()).toThrow();
  expect(createClient).not.toHaveBeenCalled();
});
