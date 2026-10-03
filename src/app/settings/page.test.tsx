import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import SettingsPage from "./page";

const mocks = vi.hoisted(() => ({ getUserId: vi.fn(), getClaims: vi.fn(), getSubscriptionSummary: vi.fn(), countMonthlyUsage: vi.fn(), listAnalyses: vi.fn(), redirect: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getUserId: mocks.getUserId }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getClaims: mocks.getClaims } }) }));
vi.mock("@/lib/data", () => mocks);
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, useRouter: () => mocks }));
vi.mock("@/components/ui/Headers", () => ({ AppHeader: ({ active, plan }: { active: string; plan: string }) => <div data-testid="header">{active}:{plan}</div> }));
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUserId.mockResolvedValue("owner");
  mocks.getClaims.mockResolvedValue({ data: { claims: { sub: "owner", email: "member@example.com" } }, error: null });
  mocks.getSubscriptionSummary.mockResolvedValue({ plan: "free" });
  mocks.countMonthlyUsage.mockResolvedValue(2);
  mocks.listAnalyses.mockResolvedValue([]);
  mocks.redirect.mockImplementation((path) => { throw new Error(`redirect:${path}`); });
});
it("J7: 인증된 본인의 구독·사용량·목록 DTO로 설정 화면과 활성 헤더를 표시한다", async () => {
  render(await SettingsPage());
  expect(screen.getByTestId("header")).toHaveTextContent("settings:free");
  expect(screen.getByRole("heading", { name: "설정" })).toBeVisible();
  expect(screen.getByText(/이번 달 분석 2\/5회 사용/)).toBeVisible();
  expect(screen.getByText("member@example.com")).toBeVisible();
  for (const read of [mocks.getSubscriptionSummary, mocks.countMonthlyUsage, mocks.listAnalyses]) expect(read).toHaveBeenCalledWith("owner");
});
it("비인증 접근은 DB 조회 전 로그인으로 이동한다", async () => {
  mocks.getUserId.mockResolvedValue(null);
  await expect(SettingsPage()).rejects.toThrow("redirect:/login");
  for (const read of [mocks.getSubscriptionSummary, mocks.countMonthlyUsage, mocks.listAnalyses]) expect(read).not.toHaveBeenCalled();
});
it("다른 claims의 이메일을 설정에 노출하지 않는다", async () => {
  mocks.getClaims.mockResolvedValue({ data: { claims: { sub: "other", email: "foreign@example.com" } } });
  render(await SettingsPage());
  expect(screen.queryByText("foreign@example.com")).not.toBeInTheDocument();
});
it("Pro 해지 예약은 종료일과 포털 링크를 표시한다", async () => {
  mocks.getSubscriptionSummary.mockResolvedValue({ plan: "pro", cancelAtPeriodEnd: true, currentPeriodEnd: "2026-10-29T00:00:00Z" });
  render(await SettingsPage());
  expect(screen.getByTestId("header")).toHaveTextContent("settings:pro");
  expect(screen.getByText(/2026.10.29까지 Pro/)).toBeVisible();
  expect(screen.getByRole("link", { name: "구독 관리" })).toHaveAttribute("href", "/api/portal");
});
