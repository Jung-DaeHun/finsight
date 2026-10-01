import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { DemoBanner } from "./DemoBanner";

it("활성일 때만 데모 모드를 표시한다", () => {
  const { rerender } = render(<DemoBanner enabled={false} />);
  expect(screen.queryByText("데모 모드")).not.toBeInTheDocument();
  rerender(<DemoBanner enabled />);
  expect(screen.getByText("데모 모드")).toBeInTheDocument();
});
