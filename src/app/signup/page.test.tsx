import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import SignupPage from "./page";
const mocks = vi.hoisted(() => ({ getUserId: vi.fn(), redirect: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getUserId: mocks.getUserId }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/components/auth/SignupForm", () => ({ SignupForm: () => <div>가입 폼</div> }));
beforeEach(() => { vi.resetAllMocks(); mocks.redirect.mockImplementation((path) => { throw new Error(`redirect:${path}`); }); });

it("로그인 사용자는 가입 화면에서 대시보드로 이동한다", async () => {
  mocks.getUserId.mockResolvedValue("owner");
  await expect(SignupPage()).rejects.toThrow("redirect:/dashboard");
});
it("비로그인 사용자는 가입 폼을 볼 수 있다", async () => {
  mocks.getUserId.mockResolvedValue(null);
  render(await SignupPage());
  expect(screen.getByText("가입 폼")).toBeVisible();
});
