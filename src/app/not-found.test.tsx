import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import NotFound from "./not-found";

it("없는 페이지에서 대시보드로 돌아갈 수 있다", () => {
  render(<NotFound />);
  expect(screen.getByRole("link", { name: "대시보드로 돌아가기" })).toHaveAttribute("href", "/dashboard");
});
