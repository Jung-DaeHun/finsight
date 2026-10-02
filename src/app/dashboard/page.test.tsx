import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import DashboardPage from "./page";
const mocks = vi.hoisted(() => ({ getClaims: vi.fn(), getUserPlan: vi.fn(), recoverStaleAnalyses: vi.fn(), redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getClaims: mocks.getClaims } }) }));
vi.mock("@/lib/data", () => ({ getUserPlan: mocks.getUserPlan, recoverStaleAnalyses: mocks.recoverStaleAnalyses }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/components/ui/Headers", () => ({ AppHeader: ({ email }: { email: string }) => <div>{email}</div> }));
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getClaims.mockResolvedValue({ data: null, error: null });
  mocks.getUserPlan.mockResolvedValue("free");
  mocks.redirect.mockImplementation((path) => { throw new Error(`redirect:${path}`); });
});

it("임시 대시보드도 claims 인증과 사용자 소유권으로 조회한다", async () => {
  mocks.getClaims.mockResolvedValue({ data: { claims: { sub: "owner", email: "member@example.com" } }, error: null });
  render(await DashboardPage());
  expect(screen.getByRole("heading", { name: "대시보드" })).toBeVisible();
  expect(mocks.getUserPlan).toHaveBeenCalledWith("owner");
  expect(mocks.recoverStaleAnalyses).toHaveBeenCalledWith("owner");
});
it("대시보드는 인증 실패 시 DB 조회 전 로그인으로 이동한다", async () => {
  await expect(DashboardPage()).rejects.toThrow("redirect:/login");
  expect(mocks.getUserPlan).not.toHaveBeenCalled();
});
