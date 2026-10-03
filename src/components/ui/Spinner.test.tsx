import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { Spinner } from "./Spinner";

it("진행 상태 이름을 제공한다", () => {
  render(<Spinner label="분석 중" />);
  expect(screen.getByRole("status", { name: "분석 중" })).toBeInTheDocument();
});
