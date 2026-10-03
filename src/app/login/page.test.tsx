import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import LoginPage from "./page";

const mocks = vi.hoisted(() => ({ getUserId: vi.fn(), redirect: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getUserId: mocks.getUserId }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/components/auth/LoginForm", () => ({ LoginForm: ({ initialError }: { initialError?: string }) => <div>로그인 폼 {initialError}</div> }));
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUserId.mockResolvedValue(null);
  mocks.redirect.mockImplementation((path) => { throw new Error(`redirect:${path}`); });
});

it("J1.4 로그인한 사용자는 login에서 대시보드로 이동한다", async () => {
  mocks.getUserId.mockResolvedValue("owner");
  await expect(LoginPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirect:/dashboard");
});

it("비로그인 로그인 화면에는 허용된 오류 코드만 전달한다", async () => {
  render(await LoginPage({ searchParams: Promise.resolve({ error: "<script>evil</script>" }) }));
  expect(screen.getByText("로그인 폼")).toBeVisible();
  expect(screen.queryByText(/evil/)).not.toBeInTheDocument();
});

it("OAuth 실패 코드를 로그인 폼에 전달한다", async () => {
  render(await LoginPage({ searchParams: Promise.resolve({ error: "oauth_failed" }) }));
  expect(screen.getByText("로그인 폼 oauth_failed")).toBeVisible();
});
