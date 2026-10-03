import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { summarize } from "@/lib/analysis";
import { toAnalysisView } from "@/lib/plan";
import { ERROR_MESSAGES } from "@/messages/errors";
import type { AnalysisRow, AnalysisView, Insight, Plan, Transaction } from "@/types";
import { ResultView } from "./ResultView";

const txs: Transaction[] = Array.from({ length: 13 }, (_, i) => ({
  occurredOn: `2026-09-${String(i + 1).padStart(2, "0")}`,
  merchant: i % 2 ? "동네 카페" : "마을 식당", amount: 10000,
  direction: "debit", category: i % 2 ? "cafe" : "food",
  description: "일시불", isRecurring: false, anomalyType: null,
}));
txs[0] = { ...txs[0], merchant: "영상 구독", category: "subscription", isRecurring: true };
txs[1] = { ...txs[0], occurredOn: "2026-09-02", amount: 11000 };
txs[2] = { ...txs[2], merchant: "중복 상점", anomalyType: "duplicate" };
txs[3] = { ...txs[2] };
txs[4] = { ...txs[4], merchant: "급증 상점", amount: 70000, anomalyType: "spike" };
txs[12] = { ...txs[12], merchant: "환불 상점", amount: 5000, direction: "credit" };
const row: AnalysisRow = {
  id: "analysis-id", userId: "owner", status: "completed", errorCode: null, failedUpload: null,
  summary: summarize(txs), detections: { recurringCount: 2, anomalyCount: 3 }, insights: null,
  createdAt: "2026-10-01T00:00:00Z", completedAt: "2026-10-01T00:01:00Z",
};
function view(plan: Plan = "pro"): AnalysisView {
  return toAnalysisView({ row, transactions: txs, trend: {
    points: Array.from({ length: 7 }, (_, i) => ({ month: `2026-${String(i + 3).padStart(2, "0")}`, total: 200000 - i * 10000 })),
    comparison: { month: "2026-09", previousMonth: "2026-08", delta: -10000, percent: -6.7 },
  } }, plan);
}
const fetchedInsights: Insight[] = [{ title: "구독 확인", body: "영상 구독을 확인하세요.", monthlySaving: 10000 }];
const fetchMock = vi.fn();
beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); });
function transactions() { return screen.getByRole("region", { name: "거래 내역" }); }

describe("R8·3.4 결과 DTO 계약", () => {
  it("Free는 일반 거래와 건수·4개 잠금 CTA를 표시하고 상세 플래그는 표시하지 않는다", () => {
    render(<ResultView view={view("free")} mode="user" />);
    expect(screen.getByRole("heading", { name: "2026년 9월 지출" })).toBeVisible();
    expect(screen.getByRole("link", { name: "대시보드" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByText("월별 추이 · 전월 대비")).toBeVisible();
    expect(screen.getByText("AI 인사이트 & 절약 조언")).toBeVisible();
    expect(screen.getByText("2건 발견")).toBeVisible();
    expect(screen.getByText("3건 발견")).toBeVisible();
    expect(screen.getAllByRole("link", { name: "Pro로 업그레이드" })).toHaveLength(4);
    for (const link of screen.getAllByRole("link", { name: "Pro로 업그레이드" })) expect(link).toHaveAttribute("href", "/api/checkout");
    expect(screen.queryByText("최근 결제 09.02")).not.toBeInTheDocument();
    expect(screen.queryByText("중복 의심")).not.toBeInTheDocument();
    expect(screen.queryByText("중복 결제")).not.toBeInTheDocument();
    expect(within(transactions()).getAllByText("동네 카페")[0]).toBeVisible();
    expect(within(transactions()).getByText("-₩5,000")).toBeVisible();
    expect(within(transactions()).queryByRole("columnheader", { name: "출처" })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("Pro는 최근 6개월 막대·Delta·가맹점별 최근 정기결제·이상거래를 표시한다", () => {
    render(<ResultView view={view()} mode="user" />);
    const trend = screen.getByRole("region", { name: "월별 추이" });
    expect(within(trend).getAllByRole("img")).toHaveLength(6);
    expect(within(trend).queryByRole("img", { name: /2026년 3월/ })).not.toBeInTheDocument();
    expect(within(trend).getByRole("img", { name: "2026년 9월 지출 ₩140,000" })).toHaveClass("bg-ink");
    expect(screen.getByText("전월 대비 -6.7%")).toHaveClass("text-success");
    const recurring = screen.getByRole("region", { name: "정기결제" });
    expect(within(recurring).getAllByText("영상 구독")).toHaveLength(1);
    expect(within(recurring).getByText("최근 결제 09.02")).toBeVisible();
    expect(within(recurring).getByText("₩11,000")).toBeVisible();
    expect(screen.getByRole("region", { name: "이상거래" })).toHaveTextContent("급증 상점");
    expect(screen.queryByText(/개월 연속|다음 결제|카테고리 변화/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Pro로 업그레이드" })).not.toBeInTheDocument();
  });
  it("comparison이 null이면 전월 없음·1개월 추이 안내를 표시한다", () => {
    const input = view(); input.trend = { points: [{ month: "2026-09", total: 150000 }], comparison: null };
    render(<ResultView view={input} mode="user" />);
    expect(screen.getAllByText("전월 데이터 없음")).toHaveLength(2);
    expect(screen.getByText("다음 달 명세서를 올리면 추이가 보여요")).toBeVisible();
  });
  it.each([12.5, 0])("증가·보합 %s 퍼센트는 잉크로 표시한다", (percent) => {
    const input = view(); input.trend!.comparison!.percent = percent;
    input.trend!.comparison!.delta = percent > 0 ? 20000 : 0;
    render(<ResultView view={input} mode="user" />);
    expect(screen.getByText(`전월 대비 ${percent > 0 ? "+" : ""}${percent.toFixed(1)}%`)).toHaveClass("text-ink");
  });
  it("전월 합계가 0이면 없는 데이터로 취급하지 않고 금액 변화를 표시한다", () => {
    const input = view(); input.trend!.comparison = { month: "2026-09", previousMonth: "2026-08", delta: 140000, percent: null };
    render(<ResultView view={input} mode="user" />);
    expect(screen.getByText("전월 대비 +₩140,000")).toBeVisible();
    expect(screen.queryByText("전월 데이터 없음")).not.toBeInTheDocument();
  });
  it("일평균은 거래 기간 13일로 나누어 원 단위로 반올림한다", () => {
    render(<ResultView view={view()} mode="user" />);
    const kpi = screen.getByText("일평균").parentElement!;
    expect(kpi).toHaveTextContent(`₩${Math.round(row.summary!.totalSpend / 13).toLocaleString("ko-KR")}`);
  });
  it("6.1: Pro에서 Free DTO로 바뀌면 기존 인사이트·탐지 상세가 사라진다", () => {
    const input = view(); input.insights = fetchedInsights;
    const { rerender } = render(<ResultView view={input} mode="user" />);
    expect(screen.getByText("구독 확인")).toBeVisible();
    rerender(<ResultView view={view("free")} mode="user" />);
    expect(screen.queryByText("구독 확인")).not.toBeInTheDocument();
    expect(screen.queryByText("최근 결제 09.02")).not.toBeInTheDocument();
  });
});

describe("거래 필터", () => {
  it("카테고리 클릭과 필터 해제를 거래 목록에 적용한다", () => {
    render(<ResultView view={view("free")} mode="user" />);
    const category = screen.getByRole("button", { name: /카페.*₩/ });
    fireEvent.click(category);
    expect(category).toHaveAttribute("aria-pressed", "true");
    expect(within(transactions()).queryByText("마을 식당")).not.toBeInTheDocument();
    expect(within(transactions()).getAllByText("동네 카페")).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: "필터 해제" }));
    expect(category).toHaveAttribute("aria-pressed", "false");
    expect(within(transactions()).getAllByText("마을 식당").length).toBeGreaterThan(0);
  });
  it("검색은 가맹점명에 적용하고 빈 결과를 안내한다", () => {
    render(<ResultView view={view()} mode="user" />);
    fireEvent.change(screen.getByRole("searchbox", { name: "가맹점 검색" }), { target: { value: "환불" } });
    expect(within(transactions()).getByText("1건 · -₩5,000")).toBeVisible();
    expect(within(transactions()).queryByText("동네 카페")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: "가맹점 검색" }), { target: { value: "없는 가맹점" } });
    expect(within(transactions()).getByText("조건에 맞는 거래가 없습니다.")).toBeVisible();
  });
  it("날짜 내림차순 10행을 먼저 보여주고 전체 보기·접기를 지원한다", () => {
    render(<ResultView view={view()} mode="user" />);
    expect(within(transactions()).getAllByRole("row")).toHaveLength(11);
    expect(within(transactions()).getAllByRole("row")[1]).toHaveTextContent("09.13");
    fireEvent.click(screen.getByRole("button", { name: "전체 보기 (13)" }));
    expect(within(transactions()).getAllByRole("row")).toHaveLength(14);
    expect(within(transactions()).getAllByText("중복 의심")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "접기" }));
    expect(within(transactions()).getAllByRole("row")).toHaveLength(11);
  });
  it("가맹점·설명·인사이트의 HTML을 텍스트로 렌더한다", () => {
    const input = view(); input.transactions![12].merchant = "<img src=x onerror=alert(1)>";
    input.transactions![12].description = "<script>bad()</script>";
    input.insights = [{ title: "<b>확인</b>", body: "**내용** <img src=x>", monthlySaving: 0 }];
    const { container } = render(<ResultView view={input} mode="user" />);
    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeVisible();
    expect(screen.getByText("<b>확인</b>")).toBeVisible();
    expect(container.querySelector("script, img, b")).toBeNull();
  });
});

describe("인사이트 상태 전이", () => {
  it("idle → loading → done: POST는 재클릭 없이 한 번 보내고 절약액을 표시한다", async () => {
    let resolve!: (value: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>((r) => { resolve = r; }));
    render(<ResultView view={view()} mode="user" />);
    fireEvent.click(screen.getByRole("button", { name: "인사이트 생성" }));
    expect(screen.getByText("거래 13건을 살펴보는 중…")).toBeVisible();
    expect(screen.queryByRole("button", { name: "인사이트 생성" })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/api/analyses/analysis-id/insights", { method: "POST" });
    await act(async () => { resolve(Response.json({ insights: fetchedInsights })); });
    expect(screen.getByText("구독 확인")).toBeVisible();
    expect(screen.getByText("월 ₩10,000")).toBeVisible();
  });
  it("실패 후 코드 문구로 안내하고 다시 시도한다", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ error: { code: "timeout" } }, { status: 504 }))
      .mockResolvedValueOnce(Response.json({ insights: fetchedInsights }));
    render(<ResultView view={view()} mode="user" />);
    fireEvent.click(screen.getByRole("button", { name: "인사이트 생성" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(ERROR_MESSAGES.timeout);
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("구독 확인")).toBeVisible();
  });
  it.each(["network", "invalid-json", "invalid-insights"])("%s 실패의 원문을 노출하지 않는다", async (failure) => {
    if (failure === "network") fetchMock.mockRejectedValue(new Error("private detail"));
    else if (failure === "invalid-json") fetchMock.mockResolvedValue(new Response("private detail"));
    else fetchMock.mockResolvedValue(Response.json({ insights: [{ monthlySaving: -1 }] }));
    render(<ResultView view={view()} mode="user" />);
    fireEvent.click(screen.getByRole("button", { name: "인사이트 생성" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(ERROR_MESSAGES.internal_error);
    expect(screen.queryByText(/private detail/)).not.toBeInTheDocument();
  });
  it("샘플은 저장된 인사이트와 홈 링크를 바로 표시하고 호출하지 않는다", () => {
    const input = view(); input.id = "sample"; input.insights = fetchedInsights;
    render(<ResultView view={input} mode="sample" />);
    expect(screen.getByRole("link", { name: "홈" })).toHaveAttribute("href", "/");
    expect(screen.getByText("구독 확인")).toBeVisible();
    expect(screen.queryByRole("button", { name: "인사이트 생성" })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
