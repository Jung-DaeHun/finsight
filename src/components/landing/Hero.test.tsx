import { render, screen, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { formatMonthTitle, formatWon } from "@/lib/format";
import sample from "@/sample/analysis.json";
import { Hero } from "./Hero";

vi.mock("@/sample/analysis.json", async (importOriginal) => {
  const original = await importOriginal<{ default: typeof sample }>();
  return { default: structuredClone(original.default) };
});
beforeEach(async () => {
  const original = await vi.importActual<{ default: typeof sample }>("@/sample/analysis.json");
  Object.assign(sample, structuredClone(original.default));
});

it("상위 4개 카테고리와 탐지 건수를 샘플과 같은 숫자로 표시한다", () => {
  render(<Hero startHref="/signup" />);
  const preview = within(screen.getByRole("region", { name: "샘플 분석 미리보기" }));
  expect(preview.getByText(formatWon(sample.summary.totalSpend))).toBeVisible();
  expect(preview.getByText(new RegExp(formatMonthTitle(sample.summary.period.to)))).toBeVisible();
  const amounts = Object.values(sample.summary.byCategory).sort((a, b) => b - a).slice(0, 4);
  for (const amount of amounts) expect(preview.getByText(formatWon(amount))).toBeVisible();
  expect(preview.getByText(`정기결제 ${sample.detections.recurringCount}건 · 이상거래 ${sample.detections.anomalyCount}건 발견`)).toBeVisible();
  expect(preview.getByRole("img", { name: "카테고리 비중" }).children).toHaveLength(Object.keys(sample.summary.byCategory).length);
});

it("샘플 값이 바뀌면 금액·비중·탐지 건수가 함께 바뀐다", () => {
  sample.summary.totalSpend = 2_000_000;
  sample.summary.byCategory.housing = 800_000;
  sample.detections.recurringCount = 8;
  sample.detections.anomalyCount = 6;
  render(<Hero startHref="/dashboard" />);
  expect(screen.getByText(formatWon(2_000_000))).toBeVisible();
  expect(screen.getByText(formatWon(800_000))).toBeVisible();
  expect(screen.getByTitle("주거 40.0%")).toBeInTheDocument();
  expect(screen.getByText("정기결제 8건 · 이상거래 6건 발견")).toBeVisible();
  expect(screen.getByRole("link", { name: "무료로 시작하기" })).toHaveAttribute("href", "/dashboard");
});
