import { render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { limits } from "@/lib/plan";
import { Pricing } from "./Pricing";

const signedOut = { href: "/signup", label: "무료로 시작하기" };
const signedIn = { href: "/dashboard", label: "대시보드" };

it("7개 기능을 비교하고 Free와 Pro 한도를 표시한다", () => {
  render(<Pricing start={signedOut} plan={null} />);
  const rows = within(screen.getByRole("table", { name: "Free와 Pro 기능 비교" })).getAllByRole("row");
  expect(rows).toHaveLength(8);
  const files = within(rows[1]).getAllByRole("cell");
  expect(files[1]).toHaveTextContent(`${limits("free").maxFiles}개`);
  expect(files[2]).toHaveTextContent(`최대 ${limits("pro").maxFiles}개`);
  const usage = within(rows[7]).getAllByRole("cell");
  expect(usage[1]).toHaveTextContent(`${limits("free").monthlyAnalyses}회`);
  expect(usage[2]).toHaveTextContent(`${limits("pro").monthlyAnalyses}회`);
});

it("포함·미포함을 아이콘과 함께 읽을 수 있는 글자로도 표시한다", () => {
  render(<Pricing start={signedOut} plan={null} />);
  const trend = within(screen.getByRole("row", { name: /월별 추이/ })).getAllByRole("cell");
  expect(trend[1]).toHaveTextContent("미포함");
  expect(trend[2]).toHaveTextContent("포함");
  expect(trend[2].querySelector("svg")).toHaveAttribute("aria-hidden", "true");
});

it("비로그인 방문자는 두 플랜 모두 가입으로 보낸다", () => {
  render(<Pricing start={signedOut} plan={null} />);
  expect(screen.getByRole("link", { name: "무료로 시작하기" })).toHaveAttribute("href", "/signup");
  expect(screen.getByRole("link", { name: "Pro 시작하기" })).toHaveAttribute("href", "/signup");
});

it("로그인한 Free 사용자의 Pro 버튼은 바로 결제로 간다", () => {
  render(<Pricing start={signedIn} plan="free" />);
  expect(screen.getByRole("link", { name: "대시보드" })).toHaveAttribute("href", "/dashboard");
  expect(screen.getByRole("link", { name: "Pro로 업그레이드" })).toHaveAttribute("href", "/api/checkout");
  expect(screen.queryByRole("link", { name: "Pro 시작하기" })).not.toBeInTheDocument();
});

it("Pro 사용자에게는 업그레이드 버튼 대신 이용 중임을 알린다", () => {
  render(<Pricing start={signedIn} plan="pro" />);
  expect(screen.queryByRole("link", { name: /Pro로 업그레이드|Pro 시작하기/ })).not.toBeInTheDocument();
  expect(screen.getByText("이용 중인 플랜입니다")).toBeVisible();
});
