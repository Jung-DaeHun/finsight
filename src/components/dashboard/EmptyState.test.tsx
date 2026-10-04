import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { EmptyState } from "./EmptyState";
it("첫 업로드 안내와 업로드·샘플 결과 링크를 제공한다", () => {
  render(<EmptyState />);
  expect(screen.getByRole("heading", { name: "첫 명세서를 올려 보세요" })).toBeVisible();
  expect(screen.getByText(/카드사·은행 앱에서 받은/)).toBeVisible();
  expect(screen.getByRole("link", { name: "파일 올리기" })).toHaveAttribute("href", "#upload");
  expect(screen.getByRole("link", { name: "샘플 결과 보기" })).toHaveAttribute("href", "/sample");
});
it("soft-cloud 블록 위의 보조 버튼은 배경에 묻히지 않게 흰 pill로 둔다", () => {
  render(<EmptyState />);
  expect(screen.getByRole("link", { name: "샘플 결과 보기" })).toHaveClass("bg-canvas");
});
it("B2: 드롭존과 함께 첫 화면에 보이도록 낮은 가로 배치를 쓴다", () => {
  render(<EmptyState />);
  const block = screen.getByRole("heading", { name: "첫 명세서를 올려 보세요" }).closest("section");
  expect(block).toHaveClass("py-8", "justify-between");
  expect(block).not.toHaveClass("py-[72px]");
});
