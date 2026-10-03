import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { Icon } from "./Icon";

it("아이콘을 숨김 장식으로 렌더한다", () => {
  const { container } = render(<Icon name="plus" />);
  expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});
