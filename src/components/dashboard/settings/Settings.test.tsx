import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Settings } from "./Settings";
import type { AnalysisListItem } from "@/types";

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => mocks }));
const items: AnalysisListItem[] = [
  { id: "analysis", status: "completed", createdAt: "2026-10-01T00:00:00Z", filenames: ["카드.csv", "은행.xlsx"], periodTo: "2026-09-30", totalSpend: 12000 },
  { id: "failed", status: "failed", createdAt: "2026-10-02T00:00:00Z", filenames: ["실패.csv"], errorCode: "mapping_failed" },
];
const free = { plan: "free" as const };
function show(subscription = free, records = items) {
  return render(<Settings subscription={subscription} used={2} items={records} email="member@example.com" />);
}
beforeEach(() => { vi.resetAllMocks(); vi.stubGlobal("fetch", mocks.fetch); });
afterEach(() => vi.unstubAllGlobals());

describe("J7: 설정과 분석 개별 삭제", () => {
  it("Free 구독·사용량·업그레이드·파일·생성일·이메일을 표시한다", () => {
    show();
    expect(screen.getByText(/이번 달 분석 2\/5회 사용/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Pro로 업그레이드" })).toHaveAttribute("href", "/api/checkout");
    expect(screen.getByRole("heading", { name: /분석 기록\s*\(2\)/ })).toBeVisible();
    expect(screen.getByText("카드.csv · 은행.xlsx · 2026.10.01")).toBeVisible();
    expect(screen.getByText("member@example.com")).toBeVisible();
    expect(screen.getByText("삭제하면 원본 파일도 함께 삭제됩니다. 사용한 분석 횟수는 복구되지 않습니다.")).toBeVisible();
  });
  it("Pro의 다음 결제일과 구독 관리 링크를 표시한다", () => {
    render(<Settings subscription={{ plan: "pro", currentPeriodEnd: "2026-10-29T00:00:00Z" }} used={2} items={[]} email="member@example.com" />);
    expect(screen.getByText(/\$9\/월 · 다음 결제일 2026.10.29/)).toBeVisible();
    expect(screen.getByRole("link", { name: "구독 관리" })).toHaveAttribute("href", "/api/portal");
    expect(screen.queryByText("Pro로 업그레이드")).not.toBeInTheDocument();
  });
  it("B16 Pro 구독 관리 옆에 해지 후 과거 분석 열람 안내를 두고, Free에는 두지 않는다", () => {
    const notice = "해지해도 과거 분석은 계속 볼 수 있습니다. Pro 전용 항목만 다시 잠깁니다.";
    const { unmount } = render(<Settings subscription={{ plan: "pro", currentPeriodEnd: "2026-10-29T00:00:00Z" }} used={2} items={[]} email="member@example.com" />);
    expect(within(screen.getByRole("region", { name: "구독" })).getByText(notice)).toBeVisible();
    unmount();
    show();
    expect(screen.queryByText(notice)).not.toBeInTheDocument();
  });
  it("결제일·분석 생성일은 UTC 날짜가 아니라 한국 날짜로 표시한다", () => {
    const items = [{ id: "late", status: "completed" as const, createdAt: "2026-10-01T16:00:00Z", filenames: ["카드.csv"], periodTo: "2026-09-30", totalSpend: 1000 }];
    render(<Settings subscription={{ plan: "pro", currentPeriodEnd: "2026-10-28T20:00:00Z" }} used={1} items={items} email="member@example.com" />);
    expect(screen.getByText(/다음 결제일 2026.10.29/)).toBeVisible();
    expect(screen.getByText("카드.csv · 2026.10.02")).toBeVisible();
  });
  it("기록이 없으면 빈 상태를 표시한다", () => {
    show(free, []);
    expect(screen.getByText("분석 기록이 없습니다.")).toBeVisible();
  });
});
