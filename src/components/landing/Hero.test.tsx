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

const signedOut = { href: "/signup", label: "무료로 시작하기" };

it("상위 4개 카테고리와 탐지 건수를 샘플과 같은 숫자로 표시한다", () => {
  render(<Hero start={signedOut} />);
  const preview = within(screen.getByRole("region", { name: "샘플 분석 미리보기" }));
  expect(preview.getByText("샘플")).toBeVisible();
  expect(preview.getByText("총지출")).toBeVisible();
  expect(preview.getByText(formatWon(sample.summary.totalSpend))).toBeVisible();
  expect(preview.getByText(new RegExp(formatMonthTitle(sample.summary.period.to)))).toBeVisible();
  const amounts = Object.values(sample.summary.byCategory).sort((a, b) => b - a).slice(0, 4);
  for (const amount of amounts) expect(preview.getByText(formatWon(amount))).toBeVisible();
  expect(preview.getByText(`정기결제 ${sample.detections.recurringCount}건 · 이상거래 ${sample.detections.anomalyCount}건 발견`)).toBeVisible();
  expect(preview.getByRole("img", { name: "카테고리 비중" }).children).toHaveLength(Object.keys(sample.summary.byCategory).length);
});

it("상위 4개 카테고리 이름 옆에 비중 스트립과 같은 계조의 범례를 둔다", () => {
  render(<Hero start={signedOut} />);
  const strip = screen.getByRole("img", { name: "카테고리 비중" });
  const legend = screen.getByText("주거").closest("div")!.querySelector("[data-swatch]")!;
  expect(legend.className).toContain(strip.children[0].className.match(/bg-\S+/)![0]);
  const fourth = screen.getByText("생활·마트").closest("div")!.querySelector("[data-swatch]")!;
  expect(fourth.className).toContain(strip.children[3].className.match(/bg-\S+/)![0]);
});

it("가입 버튼 근처에 확인된 사실만으로 신뢰 정보 3가지를 보여준다", () => {
  render(<Hero start={signedOut} />);
  const items = within(screen.getByRole("list", { name: "파일 보관 안내" })).getAllByRole("listitem");
  expect(items.map((item) => item.textContent)).toEqual([
    "카드사·은행 로그인 없이 내려받은 파일만 올립니다",
    "원본 파일은 본인만 접근할 수 있는 비공개 저장소에 둡니다",
    "분석을 삭제하거나 탈퇴하면 원본 파일도 함께 삭제됩니다",
  ]);
});

it("샘플 값이 바뀌면 금액·비중·탐지 건수가 함께 바뀐다", () => {
  sample.summary.totalSpend = 2_000_000;
  sample.summary.byCategory.housing = 800_000;
  sample.detections.recurringCount = 8;
  sample.detections.anomalyCount = 6;
  render(<Hero start={signedOut} />);
  expect(screen.getByText(formatWon(2_000_000))).toBeVisible();
  expect(screen.getByText(formatWon(800_000))).toBeVisible();
  expect(screen.getByTitle("주거 40.0%")).toBeInTheDocument();
  expect(screen.getByText("정기결제 8건 · 이상거래 6건 발견")).toBeVisible();
});

it.each([
  [signedOut, "/signup"],
  [{ href: "/dashboard", label: "대시보드" }, "/dashboard"],
])("시작 버튼은 로그인 상태에 맞는 문구와 경로를 쓴다 (%o)", (start, href) => {
  render(<Hero start={start} />);
  expect(screen.getByRole("link", { name: start.label })).toHaveAttribute("href", href);
  expect(screen.getByRole("link", { name: "샘플 결과 보기" })).toHaveAttribute("href", "/sample");
});
