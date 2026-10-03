import { describe, expect, it } from "vitest";
import { limits, resolvePlan, toAnalysisView } from "@/lib/plan";
import type { AnalysisRow, MonthlyTrend, Plan, Transaction } from "@/types";

const ordinary: Transaction = {
  occurredOn: "2026-09-30",
  amount: 12_000,
  direction: "debit",
  merchant: "테스트 가맹점",
  description: "일반 결제",
  category: "food",
  isRecurring: false,
  anomalyType: null,
};
const transactions: Transaction[] = [
  ordinary,
  { ...ordinary, isRecurring: true },
  { ...ordinary, anomalyType: "duplicate" },
  { ...ordinary, anomalyType: "spike" },
  { ...ordinary, isRecurring: true, anomalyType: "duplicate" },
];
const row: AnalysisRow = {
  id: "analysis-1",
  userId: "owner-1",
  status: "completed",
  errorCode: null,
  failedUpload: null,
  summary: {
    totalSpend: 60_000,
    byCategory: { food: 60_000 },
    topMerchants: [{ merchant: "테스트 가맹점", amount: 60_000 }],
    period: { from: "2026-09-30", to: "2026-09-30" },
    transactionCount: 5,
    skippedRows: 1,
  },
  detections: { recurringCount: 2, anomalyCount: 3 },
  insights: [{ title: "결제 점검", body: "정기결제를 확인해 보세요.", monthlySaving: 0 }],
  createdAt: "2026-10-01T00:00:00Z",
  completedAt: "2026-10-01T00:00:10Z",
};
const trend: MonthlyTrend = {
  points: [{ month: "2026-08", total: 50_000 }, { month: "2026-09", total: 60_000 }],
  comparison: {
    month: "2026-09", previousMonth: "2026-08", delta: 10_000, percent: 20,
  },
};
const input = { row, transactions, trend };
const plans: Plan[] = ["free", "pro"];

describe("resolvePlan", () => {
  it.each(["active", "trialing", "past_due"])("%s 상태는 Pro이다", (status) => {
    expect(resolvePlan({ status, cancelAtPeriodEnd: false, currentPeriodEnd: null })).toBe("pro");
  });

  it.each(["revoked", "canceled", "unpaid", "incomplete", "incomplete_expired", "unknown", ""])(
    "%s 상태는 Free이다",
    (status) => {
      expect(resolvePlan({ status, cancelAtPeriodEnd: false, currentPeriodEnd: null })).toBe("free");
    },
  );

  it("구독이 없으면 Free이다", () => {
    expect(resolvePlan(null)).toBe("free");
  });

  it("해지 예약이나 기간 값만으로 active 구독을 Free로 바꾸지 않는다", () => {
    expect(resolvePlan({
      status: "active", cancelAtPeriodEnd: true, currentPeriodEnd: "2020-01-01T00:00:00Z",
    })).toBe("pro");
  });
});

describe("limits", () => {
  it.each([
    { plan: "free" as const, maxFiles: 1, monthlyAnalyses: 5 },
    { plan: "pro" as const, maxFiles: 3, monthlyAnalyses: 50 },
  ])("$plan의 파일·행·월 사용량 한도를 반환한다", ({ plan, maxFiles, monthlyAnalyses }) => {
    expect(limits(plan)).toEqual({ maxFiles, maxBytesPerFile: 1_048_576, maxSheetRows: 1200, monthlyAnalyses });
  });
});

describe("toAnalysisView", () => {
  it("R4 · 3.4: Free는 일반 거래와 탐지 건수만 받으며 유료 필드 키가 없다", () => {
    const view = toAnalysisView(input, "free");
    expect(view).toEqual({
      id: row.id,
      status: "completed",
      summary: row.summary,
      transactions: transactions.map(() => ({
        occurredOn: "2026-09-30", amount: 12_000, direction: "debit",
        merchant: "테스트 가맹점", description: "일반 결제", category: "food",
      })),
      detections: { recurringCount: 2, anomalyCount: 3 },
    });
    for (const key of ["isRecurring", "anomalyType", "items", "trend", "insights"]) {
      expect(JSON.stringify(view)).not.toContain(key);
    }
    expect(view).not.toHaveProperty("trend");
    expect(view).not.toHaveProperty("insights");
    expect(view.detections).not.toHaveProperty("items");
  });

  it("R8: Pro는 탐지 거래만 중복 없이 상세에 포함하고 추이·인사이트를 받는다", () => {
    const view = toAnalysisView(input, "pro");
    expect(view).toEqual({
      ...toAnalysisView(input, "free"),
      detections: { recurringCount: 2, anomalyCount: 3, items: transactions.slice(1) },
      trend,
      insights: row.insights,
    });
    for (const transaction of view.transactions!) {
      expect(transaction).not.toHaveProperty("isRecurring");
      expect(transaction).not.toHaveProperty("anomalyType");
    }
  });

  it.each(plans)("R8: %s의 processing은 id와 status만 노출한다", (plan) => {
    expect(toAnalysisView({ ...input, row: {
      ...row, status: "processing", errorCode: "timeout",
      failedUpload: { id: "upload-1", filename: "명세서.xlsx" },
    } }, plan)).toEqual({ id: row.id, status: "processing" });
  });

  it.each(plans)("R8: %s의 failed는 오류·실패 파일 식별자와 이름만 노출한다", (plan) => {
    const failedUpload = { id: "upload-1", filename: "명세서.xlsx", storagePath: "private/path" };
    expect(toAnalysisView({ ...input, row: {
      ...row, status: "failed", errorCode: "file_encrypted", failedUpload,
    } }, plan)).toEqual({
      id: row.id, status: "failed", errorCode: "file_encrypted",
      failedUpload: { id: "upload-1", filename: "명세서.xlsx" },
    });
  });

  it("실패 메타데이터가 null이면 해당 선택 필드를 생략한다", () => {
    expect(toAnalysisView({ ...input, row: { ...row, status: "failed" } }, "free"))
      .toEqual({ id: row.id, status: "failed" });
  });

  it("Pro의 인사이트가 없으면 null이며 추이·비교가 없을 수도 있다", () => {
    const view = toAnalysisView({ ...input, row: { ...row, insights: null }, trend: null }, "pro");
    expect(view.insights).toBeNull();
    expect(view).not.toHaveProperty("trend");
    expect(toAnalysisView({ ...input, trend: { points: [], comparison: null } }, "pro").trend)
      .toEqual({ points: [], comparison: null });
  });

  it("탐지 결과와 거래가 비어 있어도 빈 배열과 0건을 보존한다", () => {
    const view = toAnalysisView({ ...input, transactions: [], row: {
      ...row, detections: { recurringCount: 0, anomalyCount: 0 },
    } }, "pro");
    expect(view.transactions).toEqual([]);
    expect(view.detections).toEqual({ recurringCount: 0, anomalyCount: 0, items: [] });
  });

  it("설명 없는 거래·환불 거래의 허용 필드를 보존한다", () => {
    const refund: Transaction = {
      occurredOn: "2026-10-01", amount: 500, direction: "credit", merchant: "환불 가맹점",
      category: "other", isRecurring: false, anomalyType: null,
    };
    expect(toAnalysisView({ ...input, transactions: [refund] }, "free").transactions).toEqual([{
      occurredOn: "2026-10-01", amount: 500, direction: "credit", merchant: "환불 가맹점", category: "other",
    }]);
  });

  it.each(plans)("R4: %s의 row·중첩 데이터에 새 내부 필드가 추가되어도 노출하지 않는다", (plan) => {
    const extra = { internalOnly: "서버 전용" };
    const extendedRow = {
      ...row, ...extra,
      summary: {
        ...row.summary!, ...extra,
        byCategory: { ...row.summary!.byCategory, ...extra },
        topMerchants: row.summary!.topMerchants.map((merchant) => ({ ...merchant, ...extra })),
        period: { ...row.summary!.period, ...extra },
      },
      detections: { ...row.detections!, items: transactions, ...extra },
      insights: row.insights!.map((insight) => ({ ...insight, ...extra })),
    };
    const extendedTrend = {
      ...trend, ...extra,
      points: trend.points.map((point) => ({ ...point, ...extra })),
      comparison: { ...trend.comparison!, ...extra },
    };
    const view = toAnalysisView({
      row: extendedRow,
      transactions: transactions.map((transaction) => ({ ...transaction, ...extra })),
      trend: extendedTrend,
    }, plan);
    expect(view).toEqual(toAnalysisView(input, plan));
    expect(JSON.stringify(view)).not.toContain("internalOnly");
    expect(view).not.toHaveProperty("userId");
    expect(view).not.toHaveProperty("createdAt");
    expect(view).not.toHaveProperty("completedAt");
  });

  it("6.1: Pro → Free → Pro 조회가 원본을 변경하지 않고 유료 데이터를 복원한다", () => {
    const before = JSON.stringify(input);
    const pro = toAnalysisView(input, "pro");
    const free = toAnalysisView(input, "free");
    expect(free.transactions).toHaveLength(transactions.length);
    expect(free).not.toHaveProperty("insights");
    expect(toAnalysisView(input, "pro")).toEqual(pro);
    expect(JSON.stringify(input)).toBe(before);
  });
});
