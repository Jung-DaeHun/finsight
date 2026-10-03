import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { Wordmark } from "./Wordmark";

it("홈 링크에 소문자 워드마크를 표시한다", () => {
  render(<Wordmark />);
  expect(screen.getByRole("link", { name: "finsight" })).toHaveAttribute("href", "/");
});
