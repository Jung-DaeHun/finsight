import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import TermsPage from "./page";

vi.mock("@/app/auth/actions", () => ({ signOut: vi.fn() }));

it("이용약관을 공개하고 플랜·결제·데이터 삭제 조건을 안내한다", () => {
  render(<TermsPage />);
  expect(screen.getByRole("heading", { level: 1, name: "이용약관" })).toBeVisible();
  const body = screen.getByRole("main");
  expect(body).toHaveTextContent("원화(KRW)");
  expect(body).toHaveTextContent("Free");
  expect(body).toHaveTextContent("Pro");
  expect(body).toHaveTextContent("$9");
  expect(body).toHaveTextContent("Polar");
  expect(body).toHaveTextContent("개별 삭제");
  expect(body).toHaveTextContent("회원 탈퇴");
  expect(screen.getByRole("link", { name: "개인정보처리방침" })).toHaveAttribute("href", "/privacy");
  expect(screen.getByRole("link", { name: "무료로 시작하기" })).toHaveAttribute("href", "/signup");
});
