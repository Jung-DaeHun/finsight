import { describe, expect, it } from "vitest";
import { detect, monthlyTrend, summarize } from "@/lib/analysis";
import { toAnalysisView } from "@/lib/plan";
import type { AnalysisRow, AnalysisView, Transaction } from "@/types";
import json from "./analysis.json";

const sample = json as AnalysisView;
// 샘플 사용자가 4~8월에 완료한 고정 거래 이력. 운영 이력 조회와 같은 입력이다.
const history: Transaction[] = [4, 5, 6, 7, 8].flatMap((month) => [
  ["영상 구독", 17000, "subscription"], ["음악 구독", 10900, "subscription"],
  ["동네 서점", 9900, "subscription"], ["통신 요금", 69000, "utilities"],
  ["집세", 650000, "housing"], ["생활 상점", 30000, "shopping"],
  ["생활 상점", 25000, "shopping"], ["마을 식당", 120000 + month * 10000, "food"],
].map(([merchant, amount, category]) => ({
  occurredOn: `2026-${String(month).padStart(2, "0")}-01`, merchant, amount, category,
  direction: "debit", isRecurring: false, anomalyType: null,
} as Transaction)));

describe("R8 샘플 AnalysisView", () => {
  it("9월 거래 40~80건과 Pro 계약·인사이트 3개를 제공한다", () => {
    expect(sample.id).toBe("sample"); expect(sample.status).toBe("completed");
    expect(sample.transactions!.length).toBeGreaterThanOrEqual(40);
    expect(sample.transactions!.length).toBeLessThanOrEqual(80);
    expect(sample.transactions!.every((tx) => tx.occurredOn.startsWith("2026-09-"))).toBe(true);
    expect(sample.insights).toHaveLength(3);
    expect(sample.trend!.points).toHaveLength(6);
    for (const tx of sample.transactions!) {
      expect(tx).not.toHaveProperty("isRecurring"); expect(tx).not.toHaveProperty("anomalyType");
    }
  });
  it("summary·detections·6개월 trend는 결정론적 함수 결과와 일치한다", () => {
    const txs = detect(sample.transactions!.map((tx) => ({ ...tx, isRecurring: false, anomalyType: null })), history);
    const summary = summarize(txs);
    const detections = { recurringCount: txs.filter((tx) => tx.isRecurring).length, anomalyCount: txs.filter((tx) => tx.anomalyType !== null).length };
    const row: AnalysisRow = { id: "sample", userId: "sample-user", status: "completed", errorCode: null, failedUpload: null,
      summary, detections, insights: sample.insights!, createdAt: "2026-10-01T00:00:00Z", completedAt: "2026-10-01T00:01:00Z" };
    const expected = toAnalysisView({ row, transactions: txs, trend: monthlyTrend([...history, ...txs]) }, "pro");
    expect(sample).toEqual(expected);
    expect(txs.some((tx) => tx.isRecurring)).toBe(true);
    expect(txs.some((tx) => tx.anomalyType === "duplicate")).toBe(true);
    expect(txs.some((tx) => tx.anomalyType === "spike")).toBe(true);
  });
});
