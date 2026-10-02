import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { LockCard } from "./LockCard";
it("제목·설명과 checkout 링크를 표시한다", () => {
  render(<LockCard title="카드·계좌 여러 개를 한 번에" description="Pro는 분석당 파일 3개까지 합쳐 전체 지출과 월별 추이를 보여줍니다." />);
  expect(screen.getByRole("heading", { name: "카드·계좌 여러 개를 한 번에" })).toBeVisible();
  expect(screen.getByText(/Pro는 분석당 파일 3개/)).toBeVisible();
  expect(screen.getByRole("link", { name: "Pro로 업그레이드" })).toHaveAttribute("href", "/api/checkout");
});
