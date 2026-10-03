import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { summarize } from "@/lib/analysis";
import { AnomalyPanel, CategoryPanel, KpiPanel, RecurringPanel, TrendPanel } from "./Panels";
import { ResultContext } from "./result-context";
import type { AnalysisView, Transaction } from "@/types";

it("빈 Pro DTO는 잠금 대신 빈 탐지·추이 안내를 표시한다", () => {
  const view: AnalysisView = { id: "empty", status: "completed", summary: summarize([]),
    detections: { recurringCount: 0, anomalyCount: 0, items: [] }, trend: { points: [], comparison: null }, insights: null };
  render(<ResultContext.Provider value={{ mode: "user", category: null, setCategory: vi.fn() }}>
    <CategoryPanel view={view} /><RecurringPanel view={view} /><AnomalyPanel view={view} /><TrendPanel view={view} />
  </ResultContext.Provider>);
  expect(screen.getByText("집계할 지출이 없습니다.")).toBeVisible();
  expect(screen.getByText("발견된 정기결제가 없습니다.")).toBeVisible();
  expect(screen.getByText("발견된 이상거래가 없습니다.")).toBeVisible();
  expect(screen.queryByRole("link", { name: "Pro로 업그레이드" })).not.toBeInTheDocument();
});

it("정기결제 월 금액은 같은 가맹점의 여러 달 결제를 합치지 않고 가맹점별 최근 결제액만 더한다", () => {
  const tx = (occurredOn: string, merchant: string, amount: number, isRecurring: boolean): Transaction =>
    ({ occurredOn, merchant, amount, direction: "debit", category: "subscription", isRecurring, anomalyType: null });
  const items = [tx("2026-08-28", "넷플릭스", 16000, true), tx("2026-09-26", "넷플릭스", 17000, true),
    tx("2026-09-10", "유튜브 프리미엄", 14900, true), tx("2026-09-12", "CGV 용산", 15000, false)];
  const view: AnalysisView = { id: "recurring", status: "completed", summary: summarize(items),
    detections: { recurringCount: 3, anomalyCount: 0, items }, trend: { points: [], comparison: null }, insights: null };
  render(<KpiPanel view={view} />);
  expect(screen.getByText("월 ₩31,900")).toBeVisible();
  render(<ResultContext.Provider value={{ mode: "user", category: null, setCategory: vi.fn() }}><RecurringPanel view={view} /></ResultContext.Provider>);
  expect(screen.getByText("3건 · 월 ₩31,900")).toBeVisible();
});
