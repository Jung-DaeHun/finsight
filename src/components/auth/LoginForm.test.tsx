import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { LoginForm } from "./LoginForm";

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(), signInWithOAuth: vi.fn(), resend: vi.fn(),
  replace: vi.fn(), refresh: vi.fn(),
}));
vi.mock("@/lib/supabase/browser", () => ({ createClient: () => ({ auth: mocks }) }));
vi.mock("next/navigation", () => ({ useRouter: () => mocks }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://finsight.example");
  mocks.signInWithPassword.mockResolvedValue({ error: null });
  mocks.signInWithOAuth.mockResolvedValue({ error: null });
  mocks.resend.mockResolvedValue({ error: null });
});

function fill(email = "member@example.com", password = "password123") {
  fireEvent.change(screen.getByLabelText("이메일"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: password } });
}

it("J1 이메일·비밀번호 오류를 표시하고 인증 호출을 막는다", () => {
  render(<LoginForm />);
  fill("wrong", "short");
  fireEvent.click(screen.getByRole("button", { name: "로그인" }));
  expect(screen.getByText("이메일 형식을 확인해 주세요.")).toBeVisible();
  expect(screen.getByText("비밀번호는 8자 이상입니다.")).toBeVisible();
  expect(mocks.signInWithPassword).not.toHaveBeenCalled();
});

it("로그인 성공 후 항상 대시보드로 이동한다", async () => {
  render(<LoginForm />);
  fill();
  fireEvent.click(screen.getByRole("button", { name: "로그인" }));
  await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/dashboard"));
  expect(mocks.signInWithPassword).toHaveBeenCalledWith({ email: "member@example.com", password: "password123" });
  expect(mocks.refresh).toHaveBeenCalledOnce();
});

it("J1.1 미인증 이메일에 인증 안내와 재발송을 제공한다", async () => {
  mocks.signInWithPassword.mockResolvedValue({ error: { code: "email_not_confirmed" } });
  render(<LoginForm />);
  fill();
  fireEvent.click(screen.getByRole("button", { name: "로그인" }));
  expect(await screen.findByText("이메일 인증이 필요합니다.")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "인증 메일 다시 보내기" }));
  await waitFor(() => expect(mocks.resend).toHaveBeenCalledWith({
    type: "signup", email: "member@example.com",
    options: { emailRedirectTo: "https://finsight.example/auth/confirm" },
  }));
  expect(mocks.replace).not.toHaveBeenCalled();
});

it("J1 Google 로그인에 OAuth callback URL을 사용한다", async () => {
  render(<LoginForm />);
  fireEvent.click(screen.getByRole("button", { name: "Google로 계속하기" }));
  await waitFor(() => expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
    provider: "google", options: { redirectTo: "https://finsight.example/auth/callback" },
  }));
});

it("인증 메일 재발송 실패 후에도 재발송 버튼을 유지한다", async () => {
  mocks.signInWithPassword.mockResolvedValue({ error: { code: "email_not_confirmed" } });
  mocks.resend.mockResolvedValue({ error: { code: "over_email_send_rate_limit" } });
  render(<LoginForm />);
  fill();
  fireEvent.click(screen.getByRole("button", { name: "로그인" }));
  fireEvent.click(await screen.findByRole("button", { name: "인증 메일 다시 보내기" }));
  expect(await screen.findByText("요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.")).toBeVisible();
  expect(screen.getByRole("button", { name: "인증 메일 다시 보내기" })).toBeEnabled();
});

it("인증 처리 중 재제출과 Google 버튼을 비활성화한다", async () => {
  let finish!: (value: { error: null }) => void;
  mocks.signInWithPassword.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  render(<LoginForm />);
  fill();
  fireEvent.click(screen.getByRole("button", { name: "로그인" }));
  expect(screen.getByRole("button", { name: "로그인 중" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Google로 계속하기" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "로그인 중" }));
  expect(mocks.signInWithPassword).toHaveBeenCalledOnce();
  finish({ error: null });
  await waitFor(() => expect(mocks.replace).toHaveBeenCalled());
});

it("J1.6 OAuth 실패·만료된 링크는 한국어 안내를 표시한다", () => {
  render(<LoginForm initialError="auth_link_expired" />);
  expect(screen.getByText("인증 링크가 만료되었거나 유효하지 않습니다. 인증 메일을 다시 받아 주세요.")).toBeVisible();
  expect(screen.getByRole("button", { name: "인증 메일 다시 보내기" })).toBeVisible();
  expect(screen.getByRole("link", { name: "비밀번호를 잊으셨나요?" })).toHaveAttribute("href", "/reset-password");
});

it("네트워크 예외의 원문을 노출하지 않고 다시 시도할 수 있다", async () => {
  mocks.signInWithPassword.mockRejectedValue(new Error("private auth payload"));
  render(<LoginForm />);
  fill();
  fireEvent.click(screen.getByRole("button", { name: "로그인" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("인증 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  expect(screen.queryByText(/private auth payload/)).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "로그인" })).toBeEnabled();
});
