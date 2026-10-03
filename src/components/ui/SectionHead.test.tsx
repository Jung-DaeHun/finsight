import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { SectionHead } from "./SectionHead";

it("제목과 0개도 표시한다", () => {
  render(<SectionHead title="내 분석" count={0} />);
  expect(screen.getByRole("heading", { name: /내 분석\s*\(0\)/ })).toBeInTheDocument();
});
