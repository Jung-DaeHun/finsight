import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import DashboardPage from "./page";

const mocks = vi.hoisted(() => ({
  getUserId: vi.fn(), getClaims: vi.fn(), getUserPlan: vi.fn(), recoverStaleAnalyses: vi.fn(),
  countMonthlyUsage: vi.fn(), listAnalyses: vi.fn(), redirect: vi.fn(), push: vi.fn(), refresh: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ getUserId: mocks.getUserId }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getClaims: mocks.getClaims } }) }));
vi.mock("@/lib/data", () => mocks);
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, useRouter: () => mocks }));
vi.mock("./actions", () => ({ getFailedUploadFilename: vi.fn() }));
vi.mock("@/components/ui/Headers", () => ({ AppHeader: ({ email }: { email: string }) => <div>{email}</div> }));
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUserId.mockResolvedValue("owner");
  mocks.getClaims.mockResolvedValue({ data: { claims: { sub: "owner", email: "member@example.com" } }, error: null });
  mocks.getUserPlan.mockResolvedValue("free");
  mocks.countMonthlyUsage.mockResolvedValue(2);
  mocks.listAnalyses.mockResolvedValue([]);
  mocks.redirect.mockImplementation((path) => { throw new Error(`redirect:${path}`); });
});
it("J2: 인증·정체 복구 후 본인 원장과 목록으로 빈 화면을 표시한다", async () => {
  render(await DashboardPage());
  expect(screen.getByRole("heading", { name: "대시보드" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "첫 명세서를 올려 보세요" })).toBeVisible();
  expect(screen.queryByRole("heading", { name: /내 분석/ })).not.toBeInTheDocument();
  expect(screen.getByText("이번 달 분석")).toBeVisible();
  expect(screen.getByText("2 / 5회")).toBeVisible();
  for (const [name, href] of [["파일 올리기", "#upload"], ["샘플 결과 보기", "/sample"]]) {
    expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
  }
  // 빈 상태에서는 같은 목적지의 primary가 둘이 되지 않도록 `새 분석` 대신 `파일 올리기`만 둔다(UX_GUIDE 2.3·2.4).
  expect(screen.queryByRole("link", { name: "새 분석" })).not.toBeInTheDocument();
  // 정체 복구는 listAnalyses 안에서 하므로 페이지가 따로 호출하지 않는다.
  for (const read of [mocks.getUserPlan, mocks.countMonthlyUsage, mocks.listAnalyses]) expect(read).toHaveBeenCalledWith("owner");
  expect(mocks.recoverStaleAnalyses).not.toHaveBeenCalled();
});
it("기록이 있으면 빈 상태 대신 완료 목록과 Free 잠금 카드를 표시한다", async () => {
  mocks.listAnalyses.mockResolvedValue([{ id: "analysis", status: "completed", createdAt: "2026-10-01T00:00:00Z", filenames: ["명세서.csv"], totalSpend: 12000, periodTo: "2026-09-30" }]);
  render(await DashboardPage());
  expect(screen.queryByText("첫 명세서를 올려 보세요")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "새 분석" })).toHaveAttribute("href", "#upload");
  expect(screen.getByRole("heading", { name: /내 분석\s*\(1\)/ })).toBeVisible();
  expect(screen.getByRole("link", { name: /2026년 9월/ })).toHaveAttribute("href", "/dashboard/analyses/analysis");
  expect(screen.getByText("카드·계좌 여러 개를 한 번에")).toBeVisible();
  expect(screen.getByRole("link", { name: "Pro로 업그레이드" })).toHaveAttribute("href", "/api/checkout");
});
it("Pro는 50회 미터·3개 파일 안내를 표시하고 Free 잠금 카드를 숨긴다", async () => {
  mocks.getUserPlan.mockResolvedValue("pro");
  render(await DashboardPage());
  expect(screen.getByText("2 / 50회")).toBeVisible();
  expect(screen.getByText("파일 최대 3개 · 여러 카드·계좌를 합쳐 분석")).toBeVisible();
  expect(screen.queryByText("카드·계좌 여러 개를 한 번에")).not.toBeInTheDocument();
});
it("2.5·5.2: 기록이 없어도 성공 원장이 한도에 도달하면 업로드를 비활성화한다", async () => {
  mocks.countMonthlyUsage.mockResolvedValue(5);
  render(await DashboardPage());
  expect(screen.getByText("5 / 5회")).toBeVisible();
  expect(screen.getByRole("button", { name: "이번 달 분석 횟수를 모두 사용했습니다" })).toBeDisabled();
  expect(screen.getByText(/다음 달 1일\(UTC\)/)).toBeVisible();
});
it("인증 실패는 복구·목록 조회 전에 로그인으로 이동한다", async () => {
  mocks.getUserId.mockResolvedValue(null);
  await expect(DashboardPage()).rejects.toThrow("redirect:/login");
  for (const read of [mocks.recoverStaleAnalyses, mocks.getUserPlan, mocks.countMonthlyUsage, mocks.listAnalyses]) expect(read).not.toHaveBeenCalled();
});
it("J4: 성공 리다이렉트여도 서버 플랜이 Free이면 확인 배너를 표시한다", async () => {
  render(await DashboardPage({ searchParams: Promise.resolve({ checkout: "success" }) }));
  expect(screen.getByText("결제 확인 중")).toBeVisible();
  expect(screen.getByText("2 / 5회")).toBeVisible();
});
it("J4: 성공 리다이렉트에서 서버 플랜이 Pro이면 Toast만 표시한다", async () => {
  mocks.getUserPlan.mockResolvedValue("pro");
  render(await DashboardPage({ searchParams: Promise.resolve({ checkout: "success" }) }));
  expect(screen.queryByText("결제 확인 중")).not.toBeInTheDocument();
  expect(screen.getByText("Pro가 활성화됐습니다")).toBeVisible();
});
it("결제 성공 이외의 방문은 배너·Toast를 표시하지 않는다", async () => {
  render(await DashboardPage({ searchParams: Promise.resolve({ checkout: "canceled" }) }));
  expect(screen.queryByText("결제 확인 중")).not.toBeInTheDocument();
  expect(screen.queryByText("Pro가 활성화됐습니다")).not.toBeInTheDocument();
});
