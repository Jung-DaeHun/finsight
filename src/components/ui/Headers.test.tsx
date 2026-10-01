import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { AppHeader, PublicHeader } from "./Headers";

it("공개 및 앱 헤더의 내비게이션 경로를 제공한다", () => {
  render(<><PublicHeader signedIn={false} /><AppHeader plan="free" email="a@example.com" active="dashboard" /></>);
  expect(screen.getByRole("link", { name: "기능" })).toHaveAttribute("href", "/#features");
  expect(screen.getByRole("link", { name: "새 분석" })).toHaveAttribute("href", "/dashboard#upload");
});
