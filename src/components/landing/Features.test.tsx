import { render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { limits } from "@/lib/plan";
import { Features } from "./Features";

it("4개 기능과 현재 Pro 파일 한도를 안내한다", () => {
  render(<Features />);
  const features = within(screen.getByRole("region", { name: "형식은 신경 쓰지 마세요" }));
  expect(features.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual([
    "어떤 명세서든", "카테고리별 정리", "새는 돈 찾기", "여러 카드 한 번에",
  ]);
  expect(features.getByText(`Pro는 카드·계좌 파일 ${limits("pro").maxFiles}개를 합쳐 전체 지출을 한 번에 봅니다.`)).toBeVisible();
});
