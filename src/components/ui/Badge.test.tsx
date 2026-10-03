import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { Badge } from "./Badge";

it("Pro 배지를 잉크 반전으로 표시한다", () => {
  render(<Badge inverse>Pro</Badge>);
  expect(screen.getByText("Pro")).toHaveClass("bg-ink");
});
