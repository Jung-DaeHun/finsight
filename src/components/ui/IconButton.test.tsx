import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { IconButton } from "./IconButton";

it("접근 가능한 이름과 클릭 동작을 제공한다", () => {
  const onClick = vi.fn();
  render(<IconButton icon="trash-2" aria-label="삭제" size={36} onClick={onClick} />);
  fireEvent.click(screen.getByRole("button", { name: "삭제" }));
  expect(onClick).toHaveBeenCalledOnce();
  expect(screen.getByRole("button", { name: "삭제" })).toHaveClass("h-9");
});
