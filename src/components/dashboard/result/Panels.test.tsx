import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { summarize } from "@/lib/analysis";
import { AnomalyPanel, CategoryPanel, RecurringPanel, TrendPanel } from "./Panels";
import { ResultContext } from "./result-context";
import type { AnalysisView } from "@/types";

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
