import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import ErrorPage from "./error";

it("오류 화면에서 다시 시도할 수 있다", () => {
  const reset = vi.fn();
  render(<ErrorPage error={new Error("테스트")} reset={reset} />);
  screen.getByRole("button", { name: "다시 시도" }).click();
  expect(reset).toHaveBeenCalledOnce();
});
