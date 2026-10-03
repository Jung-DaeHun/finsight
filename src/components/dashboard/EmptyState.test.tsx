import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { EmptyState } from "./EmptyState";
it("첫 업로드 안내와 업로드·샘플 체험 링크를 제공한다", () => {
  render(<EmptyState />);
  expect(screen.getByRole("heading", { name: "첫 명세서를 올려 보세요" })).toBeVisible();
  expect(screen.getByText(/카드사·은행 앱에서 받은/)).toBeVisible();
  expect(screen.getByRole("link", { name: "파일 올리기" })).toHaveAttribute("href", "#upload");
  expect(screen.getByRole("link", { name: "샘플 결과 체험" })).toHaveAttribute("href", "/sample");
});
