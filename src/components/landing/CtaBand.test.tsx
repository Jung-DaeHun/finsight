import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { CtaBand } from "./CtaBand";

it.each([
  { href: "/signup", label: "무료로 시작하기" },
  { href: "/dashboard", label: "대시보드" },
])("하단 시작 버튼을 $href로 연결한다", (start) => {
  render(<CtaBand start={start} />);
  expect(screen.getByRole("heading", { name: "이번 달 지출부터 정리하세요" })).toBeVisible();
  expect(screen.getByRole("link", { name: start.label })).toHaveAttribute("href", start.href);
});
