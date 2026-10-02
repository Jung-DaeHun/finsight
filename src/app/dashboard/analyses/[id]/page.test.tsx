import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { ERROR_MESSAGES } from "@/messages/errors";
import type { AnalysisView } from "@/types";
import AnalysisPage from "./page";

const mocks = vi.hoisted(() => ({ getUserId: vi.fn(), getAnalysisView: vi.fn(), getUserPlan: vi.fn(), getClaims: vi.fn(), redirect: vi.fn(), notFound: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getUserId: mocks.getUserId }));
vi.mock("@/lib/data", () => mocks);
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getClaims: mocks.getClaims } }) }));
vi.mock("next/navigation", () => mocks);
vi.mock("@/components/ui/Headers", () => ({ AppHeader: ({ active }: { active: string }) => <div>활성 메뉴 {active}</div> }));
vi.mock("@/components/dashboard/result/ResultView", () => ({ ResultView: ({ view }: { view: AnalysisView }) => <div>결과 {view.id}</div> }));
const args = { params: Promise.resolve({ id: "owned-id" }) };
beforeEach(() => {
  vi.resetAllMocks(); mocks.getUserId.mockResolvedValue("owner"); mocks.getUserPlan.mockResolvedValue("free");
  mocks.getClaims.mockResolvedValue({ data: { claims: { sub: "owner", email: "member@example.com" } } });
  mocks.redirect.mockImplementation((path) => { throw new Error(`redirect:${path}`); });
  mocks.notFound.mockImplementation(() => { throw new Error("404"); });
});
it("인증된 소유자와 Promise params로 DTO를 조회하고 완료 결과를 표시한다", async () => {
  mocks.getAnalysisView.mockResolvedValue({ id: "owned-id", status: "completed" });
  render(await AnalysisPage(args));
  expect(mocks.getAnalysisView).toHaveBeenCalledWith("owner", "owned-id");
  expect(screen.getByText("결과 owned-id")).toBeVisible();
  expect(screen.getByText("활성 메뉴 dashboard")).toBeVisible();
});
it("본인에게 없는 ID는 동일한 404를 반환한다", async () => {
  mocks.getAnalysisView.mockResolvedValue(null);
  await expect(AnalysisPage(args)).rejects.toThrow("404");
  expect(mocks.getUserPlan).not.toHaveBeenCalled();
});
it("비인증 요청은 조회 전에 로그인으로 이동한다", async () => {
  mocks.getUserId.mockResolvedValue(null);
  await expect(AnalysisPage(args)).rejects.toThrow("redirect:/login");
  expect(mocks.getAnalysisView).not.toHaveBeenCalled();
});
it("processing은 분석 중 안내와 대시보드 링크를 표시한다", async () => {
  mocks.getAnalysisView.mockResolvedValue({ id: "owned-id", status: "processing" });
  render(await AnalysisPage(args));
  expect(screen.getByRole("heading", { name: "분석 중" })).toBeVisible();
  expect(screen.getByRole("link", { name: "대시보드로 돌아가기" })).toHaveAttribute("href", "/dashboard");
  expect(screen.queryByText("결과 owned-id")).not.toBeInTheDocument();
});
it("failed는 중앙 오류 문구와 실패 파일명을 텍스트로 표시한다", async () => {
  mocks.getAnalysisView.mockResolvedValue({ id: "owned-id", status: "failed", errorCode: "file_encrypted", failedUpload: { id: "upload", filename: "<script>명세서</script>.xls" } });
  const { container } = render(await AnalysisPage(args));
  expect(screen.getByText(ERROR_MESSAGES.file_encrypted)).toBeVisible();
  expect(screen.getByText("<script>명세서</script>.xls")).toBeVisible();
  expect(container.querySelector("script")).toBeNull();
});
