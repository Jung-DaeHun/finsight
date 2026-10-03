import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Analyzing } from "./Analyzing";
afterEach(() => vi.useRealTimers());
it("2.1: 다섯 단계를 시간으로 넘기되 마지막 단계에서 응답을 기다린다", () => {
  vi.useFakeTimers();
  const { unmount } = render(<Analyzing filenames={["카드.csv", "은행.xlsx"]} />);
  expect(screen.getByRole("heading", { name: "명세서를 분석하고 있습니다" })).toBeVisible();
  expect(screen.getByText("카드.csv, 은행.xlsx")).toBeVisible();
  expect(screen.getByRole("list", { name: "분석 단계" }).children).toHaveLength(5);
  expect(screen.getByText("파일 읽는 중")).toHaveAttribute("aria-current", "step");
  act(() => vi.advanceTimersByTime(60_000));
  expect(screen.getByText("요약 만드는 중")).toHaveAttribute("aria-current", "step");
  expect(screen.getByText("창을 닫지 마세요. 파일 3개 기준 최대 4분까지 걸릴 수 있습니다.")).toBeVisible();
  act(() => vi.advanceTimersByTime(600_000));
  expect(screen.getByText("요약 만드는 중")).toHaveAttribute("aria-current", "step");
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
it("B14: 아직 시작하지 않은 단계도 읽을 수 있는 mute 글자로 표시한다", () => {
  render(<Analyzing filenames={["카드.csv"]} />);
  const pending = screen.getByText("요약 만드는 중");
  expect(pending).toHaveClass("text-mute");
  expect(pending).not.toHaveClass("text-stone");
});
