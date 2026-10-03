import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, it, vi } from "vitest";
import { Button } from "./Button";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => <a data-next-link="" href={href} {...props}>{children}</a>,
}));

it("variant, 크기, 링크와 비활성 상태를 렌더한다", () => {
  render(<><Button variant="secondary" size="sm">보조</Button><Button disabled>중지</Button><Button href="/sample" variant="on-image">샘플</Button></>);
  expect(screen.getByRole("button", { name: "보조" })).toHaveClass("bg-soft-cloud", "h-9");
  expect(screen.getByRole("button", { name: "중지" })).toBeDisabled();
  expect(screen.getByRole("link", { name: "샘플" })).toHaveAttribute("href", "/sample");
});

it("API 라우트 링크는 prefetch·RSC 요청으로 실행되지 않도록 next/link 대신 일반 a로 렌더한다", () => {
  render(<><Button href="/api/checkout">업그레이드</Button><Button href="/dashboard">대시보드</Button></>);
  expect(screen.getByRole("link", { name: "업그레이드" })).toHaveAttribute("href", "/api/checkout");
  expect(screen.getByRole("link", { name: "업그레이드" })).not.toHaveAttribute("data-next-link");
  expect(screen.getByRole("link", { name: "대시보드" })).toHaveAttribute("data-next-link");
});
