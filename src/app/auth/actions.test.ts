// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { signOut } from "./actions";

const mocks = vi.hoisted(() => ({ signOut: vi.fn(), redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { signOut: mocks.signOut } }) }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
beforeEach(() => { vi.resetAllMocks(); mocks.signOut.mockResolvedValue({ error: null }); });

it("로그아웃 Server Action이 Supabase 세션을 지운 뒤 랜딩으로 이동한다", async () => {
  await signOut();
  expect(mocks.signOut).toHaveBeenCalledOnce();
  expect(mocks.redirect).toHaveBeenCalledWith("/");
  expect(mocks.signOut.mock.invocationCallOrder[0]).toBeLessThan(mocks.redirect.mock.invocationCallOrder[0]);
});
