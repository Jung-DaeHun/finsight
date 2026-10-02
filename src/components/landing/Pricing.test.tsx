import { render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { limits } from "@/lib/plan";
import { Pricing } from "./Pricing";

it("7개 기능을 비교하고 Free와 Pro 한도를 표시한다", () => {
  render(<Pricing startHref="/signup" />);
  const rows = within(screen.getByRole("table", { name: "Free와 Pro 기능 비교" })).getAllByRole("row");
  expect(rows).toHaveLength(8);
  const files = within(rows[1]).getAllByRole("cell");
  expect(files[1]).toHaveTextContent(`${limits("free").maxFiles}개`);
  expect(files[2]).toHaveTextContent(`최대 ${limits("pro").maxFiles}개`);
  const usage = within(rows[7]).getAllByRole("cell");
  expect(usage[1]).toHaveTextContent(`${limits("free").monthlyAnalyses}회`);
  expect(usage[2]).toHaveTextContent(`${limits("pro").monthlyAnalyses}회`);
  expect(screen.getByRole("link", { name: "Pro 시작하기" })).toHaveAttribute("href", "/signup");
});
