import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { CtaBand } from "./CtaBand";

it.each(["/signup", "/dashboard"])("하단 시작 버튼을 %s로 연결한다", (startHref) => {
  render(<CtaBand startHref={startHref} />);
  expect(screen.getByRole("heading", { name: "이번 달 지출부터 정리하세요" })).toBeVisible();
  expect(screen.getByRole("link", { name: "무료로 시작하기" })).toHaveAttribute("href", startHref);
});
