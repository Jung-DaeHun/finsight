import { render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import PrivacyPage from "./page";

vi.mock("@/app/auth/actions", () => ({ signOut: vi.fn() }));

it("개인정보 수집 항목·보관 기간·삭제 방법을 공개한다", () => {
  render(<PrivacyPage />);
  expect(screen.getByRole("heading", { level: 1, name: "개인정보처리방침" })).toBeVisible();
  const body = screen.getByRole("main");
  expect(body).toHaveTextContent("이메일");
  expect(body).toHaveTextContent("업로드 원본 파일과 거래 내역");
  expect(body).toHaveTextContent("사용자가 삭제하거나 탈퇴할 때까지");
  expect(body).toHaveTextContent("설정");
  expect(body).toHaveTextContent("개별 삭제");
  expect(body).toHaveTextContent("회원 탈퇴");
  expect(screen.getByRole("link", { name: "설정" })).toHaveAttribute("href", "/settings");
});

it("수탁사 4곳의 국가·전달 항목·처리 목적을 명시한다", () => {
  render(<PrivacyPage />);
  const table = within(screen.getByRole("table", { name: "처리 위탁 및 국외 이전" }));
  const rows = table.getAllByRole("row");
  expect(rows).toHaveLength(5);
  expect(rows[1]).toHaveTextContent("Anthropic");
  expect(rows[1]).toHaveTextContent("미국");
  expect(rows[1]).toHaveTextContent("가맹점명");
  expect(rows[1]).toHaveTextContent("명세서 헤더 일부");
  expect(rows[1]).toHaveTextContent("분류");
  expect(rows[1]).toHaveTextContent("인사이트 생성");
  expect(rows[2]).toHaveTextContent("Polar");
  expect(rows[2]).toHaveTextContent("미국");
  expect(rows[2]).toHaveTextContent("결제");
  expect(rows[3]).toHaveTextContent("Vercel");
  expect(rows[3]).toHaveTextContent("미국");
  expect(rows[3]).toHaveTextContent("호스팅");
  expect(rows[4]).toHaveTextContent("Supabase");
  expect(rows[4]).toHaveTextContent("대한민국(서울 리전)");
  expect(rows[4]).toHaveTextContent("저장");
});

it("로그인 없이 공개 헤더와 약관 링크를 제공한다", () => {
  render(<PrivacyPage />);
  expect(screen.getByRole("navigation", { name: "공개 메뉴" })).toBeVisible();
  expect(screen.getByRole("link", { name: "무료로 시작하기" })).toHaveAttribute("href", "/signup");
  expect(screen.getByRole("link", { name: "이용약관" })).toHaveAttribute("href", "/terms");
});
