import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { FilterChip } from "./FilterChip";

it("눌림 상태를 스크린리더에 알린다", () => {
  render(<FilterChip active>전체</FilterChip>);
  expect(screen.getByRole("button", { name: "전체" })).toHaveAttribute("aria-pressed", "true");
});
