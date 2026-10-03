import { act, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { Toast } from "./Toast";

it("2.6초 뒤 사라진다", () => {
  vi.useFakeTimers();
  try {
    render(<Toast message="저장되었습니다" />);
    expect(screen.getByRole("status")).toHaveTextContent("저장되었습니다");
    act(() => { vi.advanceTimersByTime(2600); });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  } finally { vi.useRealTimers(); }
});
