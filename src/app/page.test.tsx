import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import Home from "@/app/page";

test("랜딩에 finsight 워드마크가 표시된다", () => {
  render(<Home />);

  expect(
    screen.getByRole("heading", { level: 1, name: "finsight" }),
  ).toBeInTheDocument();
});
