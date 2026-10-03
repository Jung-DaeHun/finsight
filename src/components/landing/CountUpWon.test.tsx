import { act, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CountUpWon } from "./CountUpWon";

const prefersMotion = (allowed: boolean) =>
  vi.mocked(window.matchMedia).mockReturnValue({ matches: allowed } as MediaQueryList);

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

it("서버 HTML에는 최종 금액을 넣는다", () => {
  expect(renderToString(<CountUpWon value={1_487_900} />)).toBe("₩1,487,900");
});

it("움직임 줄이기를 켜면 처음부터 최종 금액을 보여준다", () => {
  prefersMotion(false);
  render(<p><CountUpWon value={1_487_900} /></p>);
  act(() => { vi.advanceTimersByTime(100); });
  expect(screen.getByText("₩1,487,900")).toBeInTheDocument();
  expect(vi.getTimerCount()).toBe(0);
});

it("움직임을 허용하면 ₩0부터 올라가 최종 금액에서 멈춘다", () => {
  prefersMotion(true);
  render(<p><CountUpWon value={1_487_900} /></p>);
  act(() => { vi.advanceTimersByTime(16); });
  expect(screen.getByText("₩0")).toBeInTheDocument();
  act(() => { vi.advanceTimersByTime(600); });
  const middle = Number(screen.getByText(/^₩/).textContent!.replace(/\D/g, ""));
  expect(middle).toBeGreaterThan(0);
  expect(middle).toBeLessThan(1_487_900);
  act(() => { vi.advanceTimersByTime(2_000); });
  expect(screen.getByText("₩1,487,900")).toBeInTheDocument();
  expect(vi.getTimerCount()).toBe(0);
});
