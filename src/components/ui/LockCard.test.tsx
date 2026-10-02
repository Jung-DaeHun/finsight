import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { LockCard } from "./LockCard";
it("제목·설명과 checkout 링크를 표시한다", () => {
  render(<LockCard title="카드·계좌 여러 개를 한 번에" description="Pro는 분석당 파일 3개까지 합쳐 전체 지출과 월별 추이를 보여줍니다." />);
  expect(screen.getByRole("heading", { name: "카드·계좌 여러 개를 한 번에" })).toBeVisible();
  expect(screen.getByText(/Pro는 분석당 파일 3개/)).toBeVisible();
  expect(screen.getByRole("link", { name: "Pro로 업그레이드" })).toHaveAttribute("href", "/api/checkout");
});
it("발견 건수를 가짜 상세 없이 표시한다", () => {
  render(<LockCard title="정기결제" teaser="3건 발견" description="상세는 Pro에서 볼 수 있습니다." />);
  expect(screen.getByText("3건 발견")).toBeVisible();
});
