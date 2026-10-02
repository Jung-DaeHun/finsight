import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { AppHeader, PublicHeader } from "./Headers";
const mocks = vi.hoisted(() => ({ signOut: vi.fn() }));
vi.mock("@/app/auth/actions", () => ({ signOut: mocks.signOut }));

it("공개 및 앱 헤더의 내비게이션 경로를 제공한다", () => {
  render(<><PublicHeader signedIn={false} /><AppHeader plan="free" email="a@example.com" active="dashboard" /></>);
  expect(screen.getByRole("link", { name: "기능" })).toHaveAttribute("href", "/#features");
  expect(screen.getByRole("link", { name: "새 분석" })).toHaveAttribute("href", "/dashboard#upload");
});

it("앱 헤더의 로그아웃을 Server Action 폼에 연결한다", async () => {
  render(<AppHeader plan="free" email="a@example.com" active="dashboard" />);
  fireEvent.submit(screen.getByRole("button", { name: "로그아웃" }).closest("form")!);
  await waitFor(() => expect(mocks.signOut).toHaveBeenCalledOnce());
});
