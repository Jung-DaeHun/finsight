import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { formatMonthTitle, formatWon } from "@/lib/format";
import { limits } from "@/lib/plan";
import sample from "@/sample/analysis.json";

const mocks = vi.hoisted(() => ({ getUserId: vi.fn(), getUserPlan: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getUserId: mocks.getUserId }));
vi.mock("@/lib/data", () => ({ getUserPlan: mocks.getUserPlan }));
vi.mock("@/app/auth/actions", () => ({ signOut: vi.fn() }));
vi.mock("@/lib/plan", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/plan")>();
  return { ...original, limits: vi.fn(original.limits) };
});

beforeEach(async () => {
  mocks.getUserId.mockReset().mockResolvedValue(null);
  mocks.getUserPlan.mockReset().mockResolvedValue("free");
  const original = await vi.importActual<typeof import("@/lib/plan")>("@/lib/plan");
  vi.mocked(limits).mockReset().mockImplementation(original.limits);
});

describe("J1 랜딩", () => {
  it("비로그인 방문자의 모든 시작 CTA를 가입으로 연결한다", async () => {
    render(await Home());

    expect(mocks.getUserId).toHaveBeenCalledOnce();
    expect(mocks.getUserPlan).not.toHaveBeenCalled();
    const links = screen.getAllByRole("link", { name: "무료로 시작하기" });
    expect(links).toHaveLength(4);
    for (const link of links) expect(link).toHaveAttribute("href", "/signup");
    expect(screen.getByRole("link", { name: "Pro 시작하기" })).toHaveAttribute("href", "/signup");
    expect(screen.getByRole("link", { name: "샘플 결과 보기" })).toHaveAttribute("href", "/sample");
    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute("href", "/login");
  });

  it.each([
    ["free", "Pro로 업그레이드"],
    ["pro", null],
  ] as const)("로그인한 %s 사용자에게는 같은 목적지에 같은 문구(대시보드)를 쓰고 플랜에 맞는 Pro 버튼을 보여준다", async (plan, proLabel) => {
    mocks.getUserId.mockResolvedValue("signed-in-user");
    mocks.getUserPlan.mockResolvedValue(plan);
    render(await Home());

    expect(mocks.getUserPlan).toHaveBeenCalledWith("signed-in-user");
    expect(screen.queryByRole("link", { name: "무료로 시작하기" })).not.toBeInTheDocument();
    const links = screen.getAllByRole("link", { name: "대시보드" });
    expect(links).toHaveLength(4);
    for (const link of links) expect(link).toHaveAttribute("href", "/dashboard");
    expect(screen.queryByRole("link", { name: "로그인" })).not.toBeInTheDocument();
    expect(document.querySelector('a[href="/signup"]')).not.toBeInTheDocument();
    if (proLabel) expect(screen.getByRole("link", { name: proLabel })).toHaveAttribute("href", "/api/checkout");
    else expect(screen.getByText("이용 중인 플랜입니다")).toBeVisible();
  });

  it("샘플 JSON의 기간·총지출·상위 4개 카테고리·탐지 건수를 미리보기로 표시한다", async () => {
    render(await Home());
    const preview = within(screen.getByRole("region", { name: "샘플 분석 미리보기" }));
    const summary = sample.summary;
    expect(preview.getByText(new RegExp(formatMonthTitle(summary.period.to)))).toBeVisible();
    expect(preview.getByText(formatWon(summary.totalSpend))).toBeVisible();
    const topCategories = Object.entries(summary.byCategory).sort((a, b) => b[1] - a[1]).slice(0, 4);
    for (const [, amount] of topCategories) expect(preview.getByText(formatWon(amount))).toBeVisible();
    for (const name of ["주거", "식비", "쇼핑", "생활·마트"]) expect(preview.getByText(name)).toBeVisible();
    expect(preview.getByText(`정기결제 ${sample.detections.recurringCount}건 · 이상거래 ${sample.detections.anomalyCount}건 발견`)).toBeVisible();
    const strip = preview.getByRole("img", { name: "카테고리 비중" });
    expect(strip.children).toHaveLength(Object.keys(summary.byCategory).length);
    const housingShare = (summary.byCategory.housing / summary.totalSpend * 100).toFixed(1);
    expect(within(strip).getByTitle(`주거 ${housingShare}%`)).toBeInTheDocument();
  });

  it("원본 디자인의 섹션 순서와 4개 기능·3단계를 제공한다", async () => {
    render(await Home());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("명세서를 올리면지출이 정리됩니다");
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual([
      "형식은 신경 쓰지 마세요", "이용 방법", "요금제", "이번 달 지출부터 정리하세요",
    ]);
    const features = screen.getByRole("region", { name: "형식은 신경 쓰지 마세요" });
    expect(features).toHaveAttribute("id", "features");
    expect(within(features).getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual([
      "어떤 명세서든", "카테고리별 정리", "새는 돈 찾기", "여러 카드 한 번에",
    ]);
    const steps = within(screen.getByRole("region", { name: "이용 방법" }));
    expect(steps.getAllByRole("listitem")).toHaveLength(3);
    expect(steps.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual([
      "파일 올리기", "분석 기다리기", "결과 확인",
    ]);
  });

  it("Free/Pro 가격과 7행 비교표의 한도를 limits에서 표시한다", async () => {
    render(await Home());
    const pricing = within(screen.getByRole("region", { name: "요금제" }));
    expect(pricing.getByText("$0")).toBeVisible();
    expect(pricing.getByText("$20")).toBeVisible();
    expect(pricing.getByText("/ 월")).toBeVisible();
    const rows = within(pricing.getByRole("table", { name: "Free와 Pro 기능 비교" })).getAllByRole("row");
    expect(rows).toHaveLength(8);
    expect(rows[1]).toHaveTextContent(`${limits("free").maxFiles}개`);
    expect(rows[1]).toHaveTextContent(`최대 ${limits("pro").maxFiles}개 (여러 카드·계좌 통합)`);
    const cells = within(rows[7]).getAllByRole("cell");
    expect(cells[1]).toHaveTextContent(`${limits("free").monthlyAnalyses}회`);
    expect(cells[2]).toHaveTextContent(`${limits("pro").monthlyAnalyses}회`);
    expect(rows[4]).toHaveTextContent("발견 건수만");
    expect(rows[4]).toHaveTextContent("상세 목록");
    expect(pricing.getByText("월 분석 횟수는 성공한 분석 기준이며, 분석을 삭제해도 복구되지 않습니다. 원화(KRW) 명세서만 지원합니다.")).toBeVisible();
  });

  it("한도가 바뀌어도 비교표와 기능 설명이 함께 반영된다", async () => {
    const original = await vi.importActual<typeof import("@/lib/plan")>("@/lib/plan");
    vi.mocked(limits).mockImplementation((plan) => ({
      ...original.limits(plan), maxFiles: plan === "free" ? 2 : 4,
      monthlyAnalyses: plan === "free" ? 7 : 70,
    }));
    render(await Home());
    const table = within(screen.getByRole("table", { name: "Free와 Pro 기능 비교" }));
    expect(table.getByRole("row", { name: "분석당 파일 수 2개 최대 4개 (여러 카드·계좌 통합)" })).toBeVisible();
    expect(table.getByRole("row", { name: "월 분석 횟수 7회 70회" })).toBeVisible();
    expect(screen.getByText("Pro는 카드·계좌 파일 4개를 합쳐 전체 지출을 한 번에 봅니다.")).toBeVisible();
  });

  it("푸터에서 약관·개인정보처리방침·문의로 연결한다", async () => {
    render(await Home());
    const footer = within(screen.getByRole("contentinfo"));
    expect(footer.getByRole("link", { name: "finsight" })).toHaveAttribute("href", "/");
    expect(footer.getByRole("link", { name: "이용약관" })).toHaveAttribute("href", "/terms");
    expect(footer.getByRole("link", { name: "개인정보처리방침" })).toHaveAttribute("href", "/privacy");
    expect(footer.getByRole("link", { name: "문의" }).getAttribute("href")).toMatch(/^mailto:[^\s@]+@[^\s@]+$/);
    expect(footer.getByText("© 2026 finsight")).toBeVisible();
  });
});
