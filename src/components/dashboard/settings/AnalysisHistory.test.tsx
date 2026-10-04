import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Settings } from "./Settings";
import { ERROR_MESSAGES } from "@/messages/errors";
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
function response(status: number, code?: string) {
  return { status, ok: status >= 200 && status < 300, json: async () => ({ error: { code } }) };
}
function confirmAnalysis() {
  fireEvent.click(screen.getByRole("button", { name: "2026년 9월 삭제 (카드.csv, 은행.xlsx)" }));
  fireEvent.click(screen.getByRole("button", { name: "삭제" }));
}
beforeEach(() => { vi.resetAllMocks(); vi.stubGlobal("fetch", mocks.fetch); });
afterEach(() => vi.unstubAllGlobals());

describe("AnalysisHistory", () => {
  it("A11Y-1 삭제 버튼 접근성 이름에 파일명을 넣어 같은 제목의 행도 구분한다", () => {
    const failed: AnalysisListItem = { id: "failed-2", status: "failed", createdAt: "2026-10-03T00:00:00Z", filenames: ["다른.csv"], errorCode: "not_transactions" };
    show(free, [...items, failed]);
    expect(screen.getByRole("button", { name: "분석 실패 삭제 (실패.csv)" })).toBeVisible();
    expect(screen.getByRole("button", { name: "분석 실패 삭제 (다른.csv)" })).toBeVisible();
    expect(screen.getByRole("button", { name: "2026년 9월 삭제 (카드.csv, 은행.xlsx)" })).toBeVisible();
  });
  it("삭제 아이콘은 인라인 확인을 열고 취소는 요청 없이 닫는다", () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "2026년 9월 삭제 (카드.csv, 은행.xlsx)" }));
    expect(screen.getByRole("button", { name: "삭제" })).toBeVisible();
    expect(screen.getByRole("button", { name: "취소" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(screen.queryByRole("button", { name: "삭제" })).not.toBeInTheDocument();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("204는 해당 행만 제거하고 Toast·개수 갱신 후 사용량을 유지한다", async () => {
    mocks.fetch.mockResolvedValue(response(204));
    show(); confirmAnalysis();
    await waitFor(() => expect(screen.queryByText("2026년 9월")).not.toBeInTheDocument());
    expect(mocks.fetch).toHaveBeenCalledWith("/api/analyses/analysis", { method: "DELETE" });
    expect(screen.getByRole("heading", { name: /분석 기록\s*\(1\)/ })).toBeVisible();
    expect(screen.getByText("분석 실패")).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("분석을 삭제했습니다.");
    expect(screen.getByText(/이번 달 분석 2\/5회 사용/)).toBeVisible();
  });
  it.each([[409, "analysis_in_progress"], [502, "storage_delete_failed"]] as const)("%i 실패는 행·오류·재시도 버튼을 유지한다", async (status, code) => {
    mocks.fetch.mockResolvedValueOnce(response(status, code)).mockResolvedValueOnce(response(204));
    show(); confirmAnalysis();
    expect(await screen.findByRole("alert")).toHaveTextContent(ERROR_MESSAGES[code]);
    expect(screen.getByText("2026년 9월")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    await waitFor(() => expect(screen.queryByText("2026년 9월")).not.toBeInTheDocument());
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
  it.each(["network", "malformed"])("%s 오류도 행을 보존하고 원문을 표시하지 않는다", async (kind) => {
    if (kind === "network") mocks.fetch.mockRejectedValue(new Error("비공개 응답"));
    else mocks.fetch.mockResolvedValue({ ...response(502), json: async () => { throw new Error("비공개 응답"); } });
    show(); confirmAnalysis();
    expect(await screen.findByRole("alert")).toHaveTextContent(ERROR_MESSAGES.internal_error);
    expect(screen.queryByText("비공개 응답")).not.toBeInTheDocument();
    expect(screen.getByText("2026년 9월")).toBeVisible();
  });
  it("삭제 중 재클릭·취소·탈퇴 요청을 막는다", async () => {
    let resolve!: (r: unknown) => void;
    mocks.fetch.mockReturnValue(new Promise((done) => { resolve = done; }));
    show(); confirmAnalysis();
    expect(screen.getByRole("button", { name: "삭제 중…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "취소" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "회원 탈퇴" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "삭제 중…" }));
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    await act(async () => resolve(response(204)));
  });
  it("삭제 세션 만료는 로그인으로 이동한다", async () => {
    mocks.fetch.mockResolvedValue(response(401, "unauthorized"));
    show(); confirmAnalysis();
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/login"));
  });
});
