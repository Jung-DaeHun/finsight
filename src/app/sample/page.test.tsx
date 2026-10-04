import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import SamplePage from "./page";

const mocks = vi.hoisted(() => ({ getUserId: vi.fn() }));
vi.mock("@/lib/auth", () => mocks);
vi.mock("@/components/ui/Headers", () => ({ PublicHeader: ({ signedIn }: { signedIn: boolean }) => <div>{signedIn ? "로그인한 헤더" : "공개 헤더"}</div> }));
beforeEach(() => { mocks.getUserId.mockReset(); });
it.each([null, "owner"])("공개 샘플은 로그인 %s에 맞춘 헤더와 Pro 결과를 표시한다", async (userId) => {
  mocks.getUserId.mockResolvedValue(userId);
  render(await SamplePage());
  expect(screen.getByText(userId ? "로그인한 헤더" : "공개 헤더")).toBeVisible();
  expect(screen.getByText(/실제 명세서 예시로 만든 결과입니다/)).toBeVisible();
  // 같은 목적지에는 같은 문구(UX_GUIDE 2.3): 로그인 상태면 공개 헤더처럼 `대시보드`로 보낸다.
  if (userId) {
    expect(screen.getByRole("link", { name: "대시보드" })).toHaveAttribute("href", "/dashboard");
    expect(screen.queryByRole("link", { name: "무료로 시작하기" })).not.toBeInTheDocument();
  } else {
    expect(screen.getByRole("link", { name: "무료로 시작하기" })).toHaveAttribute("href", "/signup");
  }
  expect(screen.getByRole("heading", { name: "2026년 9월 지출" })).toBeVisible();
  expect(screen.getByRole("link", { name: "홈" })).toHaveAttribute("href", "/");
  expect(screen.getByText("예상 절약 가능액")).toBeVisible();
  expect(screen.queryByRole("button", { name: "인사이트 생성" })).not.toBeInTheDocument();
});
