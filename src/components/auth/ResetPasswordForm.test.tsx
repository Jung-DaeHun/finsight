import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { ResetPasswordForm } from "./ResetPasswordForm";

const mocks = vi.hoisted(() => ({ resetPasswordForEmail: vi.fn(), updateUser: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock("@/lib/supabase/browser", () => ({ createClient: () => ({ auth: mocks }) }));
vi.mock("next/navigation", () => ({ useRouter: () => mocks }));
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://finsight.example");
  mocks.resetPasswordForEmail.mockResolvedValue({ error: null });
  mocks.updateUser.mockResolvedValue({ error: null });
});

it("이메일이 유효할 때만 링크 보내기 버튼을 활성화한다", () => {
  render(<ResetPasswordForm canUpdatePassword={false} />);
  expect(screen.getByRole("button", { name: "링크 보내기" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("이메일"), { target: { value: "wrong" } });
  fireEvent.blur(screen.getByLabelText("이메일"));
  expect(screen.getByText("이메일 형식을 확인해 주세요.")).toBeVisible();
  expect(screen.getByRole("button", { name: "링크 보내기" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("이메일"), { target: { value: "member@example.com" } });
  expect(screen.getByRole("button", { name: "링크 보내기" })).toBeEnabled();
});

it("J1.3 token_hash 확인 경로로 재설정 메일을 보내고 발송 안내를 표시한다", async () => {
  render(<ResetPasswordForm canUpdatePassword={false} />);
  fireEvent.change(screen.getByLabelText("이메일"), { target: { value: "member@example.com" } });
  fireEvent.click(screen.getByRole("button", { name: "링크 보내기" }));
  const sentTo = await screen.findByText("member@example.com", { selector: "b" });
  expect(sentTo).toBeVisible();
  // 이메일 끝 글자에 따라 조사가 달라지지 않게 "메일함으로"를 붙인다(COPY-1과 같은 문제).
  expect(sentTo.parentElement).toHaveTextContent("member@example.com 메일함으로 재설정 링크를 보냈습니다.");
  expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith("member@example.com", {
    redirectTo: "https://finsight.example/auth/confirm?next=/reset-password",
  });
  expect(screen.getByRole("link", { name: "로그인으로 돌아가기" })).toHaveAttribute("href", "/login");
});

it("복구 세션에서는 새 비밀번호를 검증한다", () => {
  render(<ResetPasswordForm canUpdatePassword />);
  expect(screen.queryByLabelText("이메일")).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("새 비밀번호"), { target: { value: "short" } });
  fireEvent.click(screen.getByRole("button", { name: "비밀번호 변경" }));
  expect(screen.getByText("비밀번호는 8자 이상입니다.")).toBeVisible();
  expect(mocks.updateUser).not.toHaveBeenCalled();
});

it("J1.3 비밀번호 변경 후 대시보드로 이동한다", async () => {
  render(<ResetPasswordForm canUpdatePassword />);
  fireEvent.change(screen.getByLabelText("새 비밀번호"), { target: { value: "newpassword123" } });
  fireEvent.click(screen.getByRole("button", { name: "비밀번호 변경" }));
  await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/dashboard"));
  expect(mocks.updateUser).toHaveBeenCalledWith({ password: "newpassword123" });
  expect(mocks.refresh).toHaveBeenCalledOnce();
});

it("비밀번호 변경 실패 시 폼과 재시도 버튼을 유지한다", async () => {
  mocks.updateUser.mockResolvedValue({ error: { code: "session_not_found", message: "secret" } });
  render(<ResetPasswordForm canUpdatePassword />);
  fireEvent.change(screen.getByLabelText("새 비밀번호"), { target: { value: "newpassword123" } });
  fireEvent.click(screen.getByRole("button", { name: "비밀번호 변경" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("인증 요청을 처리하지 못했습니다.");
  expect(screen.getByRole("button", { name: "비밀번호 변경" })).toBeEnabled();
  expect(mocks.replace).not.toHaveBeenCalled();
});
