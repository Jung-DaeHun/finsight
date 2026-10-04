import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { AuthFeedback, AuthShell, EmailDivider, GoogleButton } from "./AuthShell";

it("인증 화면의 홈 워드마크·이메일 구분선·내용을 제공한다", () => {
  render(<AuthShell><h1>로그인</h1><EmailDivider /></AuthShell>);
  expect(screen.getByRole("link", { name: "finsight" })).toHaveAttribute("href", "/");
  expect(screen.getByRole("main")).toContainElement(screen.getByRole("heading", { name: "로그인" }));
  expect(screen.getByText("또는 이메일")).toBeVisible();
});

it("Google 버튼은 disabled 상태에서 인증 요청을 보내지 않는다", () => {
  const onClick = vi.fn();
  render(<GoogleButton disabled onClick={onClick} />);
  fireEvent.click(screen.getByRole("button", { name: "Google로 계속하기" }));
  expect(onClick).not.toHaveBeenCalled();
});

it("Google 버튼은 글자 G 대신 공식 Google 로고를 장식으로 보여준다", () => {
  render(<GoogleButton disabled={false} onClick={vi.fn()} />);
  const button = screen.getByRole("button", { name: "Google로 계속하기" });
  expect(button.querySelector("svg[aria-hidden='true']")).not.toBeNull();
  expect(button).toHaveTextContent(/^Google로 계속하기$/);
});

it("인증 오류와 발송 안내를 접근 가능한 상태로 제공한다", () => {
  render(<AuthFeedback error="invalid_credentials" notice="메일을 보냈습니다." />);
  expect(screen.getByRole("alert")).toHaveTextContent("이메일 또는 비밀번호를 확인해 주세요.");
  expect(screen.getByRole("status")).toHaveTextContent("메일을 보냈습니다.");
});
