import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { SignupForm } from "./SignupForm";

const mocks = vi.hoisted(() => ({ signUp: vi.fn(), signInWithOAuth: vi.fn(), resend: vi.fn() }));
vi.mock("@/lib/supabase/browser", () => ({ createClient: () => ({ auth: mocks }) }));
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://finsight.example");
  mocks.signUp.mockResolvedValue({ data: { user: { identities: [{ id: "identity" }] } }, error: null });
  mocks.signInWithOAuth.mockResolvedValue({ error: null });
  mocks.resend.mockResolvedValue({ error: null });
});

function agree() {
  for (const checkbox of screen.getAllByRole("checkbox")) fireEvent.click(checkbox);
}
function fill(email = "new@example.com", password = "password123") {
  fireEvent.change(screen.getByLabelText("이메일"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: password } });
}

it("J1 두 필수 동의 전까지 이메일·Google 가입을 비활성화한다", () => {
  render(<SignupForm />);
  const signup = screen.getByRole("button", { name: "가입하기" });
  const google = screen.getByRole("button", { name: "Google로 계속하기" });
  expect(signup).toBeDisabled();
  expect(google).toBeDisabled();
  fireEvent.click(screen.getAllByRole("checkbox")[0]);
  expect(signup).toBeDisabled();
  expect(google).toBeDisabled();
  fireEvent.click(screen.getAllByRole("checkbox")[1]);
  expect(signup).toBeEnabled();
  expect(google).toBeEnabled();
  fireEvent.click(screen.getAllByRole("checkbox")[0]);
  expect(signup).toBeDisabled();
  expect(google).toBeDisabled();
});

it("이용약관·처리방침 링크와 수탁사·국가를 명시한다", () => {
  render(<SignupForm />);
  expect(screen.getByRole("link", { name: "이용약관" })).toHaveAttribute("href", "/terms");
  expect(screen.getByRole("link", { name: "개인정보 수집·이용" })).toHaveAttribute("href", "/privacy");
  expect(screen.getByText(/Anthropic\(미국\), Polar\(미국\), Vercel\(미국\)/)).toBeVisible();
});

it("동의 검증은 버튼을 우회한 폼 제출에도 적용된다", () => {
  render(<SignupForm />);
  fill();
  fireEvent.submit(screen.getByRole("button", { name: "가입하기" }).closest("form")!);
  expect(screen.getByText("필수 항목에 동의해 주세요.")).toBeVisible();
  expect(mocks.signUp).not.toHaveBeenCalled();
});

it("가입 전 이메일·비밀번호를 검증한다", () => {
  render(<SignupForm />);
  agree();
  fill("invalid", "123");
  fireEvent.click(screen.getByRole("button", { name: "가입하기" }));
  expect(screen.getByText("이메일 형식을 확인해 주세요.")).toBeVisible();
  expect(screen.getByText("비밀번호는 8자 이상입니다.")).toBeVisible();
  expect(mocks.signUp).not.toHaveBeenCalled();
});

it.each([
  { data: { user: { identities: [{ id: "identity" }] } }, error: null },
  { data: { user: { identities: [] } }, error: null },
  { data: null, error: { code: "user_already_exists" } },
])("계정 존재 여부와 무관하게 같은 인증 메일 발송 화면을 표시한다", async (response) => {
  mocks.signUp.mockResolvedValue(response);
  render(<SignupForm />);
  agree();
  fill();
  fireEvent.click(screen.getByRole("button", { name: "가입하기" }));
  expect(await screen.findByRole("heading", { name: "메일함을 확인해 주세요" })).toBeVisible();
  expect(screen.getByText("new@example.com", { selector: "b" })).toBeVisible();
  expect(screen.queryByText(/이미 가입된 이메일/)).not.toBeInTheDocument();
  expect(mocks.signUp).toHaveBeenCalledWith({
    email: "new@example.com", password: "password123",
    options: { emailRedirectTo: "https://finsight.example/auth/confirm" },
  });
  fireEvent.click(screen.getByRole("button", { name: "인증 메일 다시 보내기" }));
  await waitFor(() => expect(mocks.resend).toHaveBeenCalledWith({
    type: "signup", email: "new@example.com",
    options: { emailRedirectTo: "https://finsight.example/auth/confirm" },
  }));
});

it("필수 동의 후에만 Google 가입 요청을 보낸다", async () => {
  render(<SignupForm />);
  fireEvent.click(screen.getByRole("button", { name: "Google로 계속하기" }));
  expect(mocks.signInWithOAuth).not.toHaveBeenCalled();
  agree();
  fireEvent.click(screen.getByRole("button", { name: "Google로 계속하기" }));
  await waitFor(() => expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
    provider: "google", options: { redirectTo: "https://finsight.example/auth/callback" },
  }));
});
