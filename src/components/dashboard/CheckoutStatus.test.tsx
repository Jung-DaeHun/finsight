import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CheckoutStatus } from "./CheckoutStatus";
const mocks = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => mocks }));
beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); });
afterEach(() => vi.useRealTimers());
it("Free일 때 디자인 문구와 soft-cloud 배너를 표시하며 3초마다 refresh한다", () => {
  render(<CheckoutStatus plan="free" />);
  expect(screen.getByText("결제 확인 중")).toBeVisible();
  expect(screen.getByText("Polar에서 결제 완료 알림을 받는 중입니다. 확인되면 자동으로 새로고침됩니다.")).toBeVisible();
  act(() => vi.advanceTimersByTime(2999));
  expect(mocks.refresh).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(1));
  expect(mocks.refresh).toHaveBeenCalledTimes(1);
});
it("상한은 총 20회이며 rerender로 횟수를 초기화하지 않는다", () => {
  const { rerender } = render(<CheckoutStatus plan="free" />);
  act(() => vi.advanceTimersByTime(30_000));
  rerender(<CheckoutStatus plan="free" />);
  act(() => vi.advanceTimersByTime(60_000));
  expect(mocks.refresh).toHaveBeenCalledTimes(20);
});
it("Pro 활성화 후 배너·refresh를 중단하고 Toast를 한 번 표시한다", () => {
  const { rerender } = render(<CheckoutStatus plan="free" />);
  act(() => vi.advanceTimersByTime(3000));
  rerender(<CheckoutStatus plan="pro" />);
  expect(screen.queryByText("결제 확인 중")).not.toBeInTheDocument();
  expect(screen.getByText("Pro가 활성화됐습니다")).toBeVisible();
  act(() => vi.advanceTimersByTime(60_000));
  expect(mocks.refresh).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Pro가 활성화됐습니다")).not.toBeInTheDocument();
  rerender(<CheckoutStatus plan="pro" />);
  expect(screen.queryByText("Pro가 활성화됐습니다")).not.toBeInTheDocument();
});
it("처음부터 Pro이면 Toast만 표시한다", () => {
  render(<CheckoutStatus plan="pro" />);
  expect(screen.queryByText("결제 확인 중")).not.toBeInTheDocument();
  expect(screen.getByText("Pro가 활성화됐습니다")).toBeVisible();
  act(() => vi.advanceTimersByTime(60_000));
  expect(mocks.refresh).not.toHaveBeenCalled();
});
it("unmount하면 refresh 타이머를 정리한다", () => {
  const { unmount } = render(<CheckoutStatus plan="free" />);
  unmount();
  act(() => vi.advanceTimersByTime(60_000));
  expect(mocks.refresh).not.toHaveBeenCalled();
});
