import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import ResetPage from "./page";
const mocks = vi.hoisted(() => ({ getUserId: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getUserId: mocks.getUserId }));
vi.mock("@/components/auth/ResetPasswordForm", () => ({ ResetPasswordForm: ({ canUpdatePassword }: { canUpdatePassword: boolean }) => <div>{canUpdatePassword ? "새 비밀번호 폼" : "이메일 폼"}</div> }));
beforeEach(() => vi.resetAllMocks());

it.each([["owner", "새 비밀번호 폼"], [null, "이메일 폼"]])("검증된 세션 %s에 맞는 폼을 표시한다", async (userId, label) => {
  mocks.getUserId.mockResolvedValue(userId);
  render(await ResetPage());
  expect(screen.getByText(label!)).toBeVisible();
});
