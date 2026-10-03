import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
function openModal() {
  fireEvent.click(screen.getByRole("button", { name: "회원 탈퇴" }));
  return screen.getByRole("dialog", { name: "회원 탈퇴" });
}
function confirmAccount() {
  fireEvent.change(screen.getByLabelText("확인을 위해 '탈퇴'를 입력하세요"), { target: { value: "탈퇴" } });
  fireEvent.click(screen.getByRole("button", { name: "탈퇴하기" }));
}
beforeEach(() => { vi.resetAllMocks(); vi.stubGlobal("fetch", mocks.fetch); });
afterEach(() => vi.unstubAllGlobals());

describe("J7·R1: 회원 탈퇴 모달", () => {
  it("3단계와 정확한 확인 입력으로만 탈퇴 버튼을 활성화한다", () => {
    show();
    const modal = openModal();
    for (const step of ["Polar 구독 취소", "원본 파일 삭제", "계정 · 분석 데이터 삭제"]) expect(within(modal).getByText(step)).toBeVisible();
    const field = screen.getByLabelText("확인을 위해 '탈퇴'를 입력하세요");
    expect(field).toHaveFocus();
    for (const value of ["", "탈", "탈퇴 ", " 탈퇴", "탈퇴합니다"]) {
      fireEvent.change(field, { target: { value } });
      expect(screen.getByRole("button", { name: "탈퇴하기" })).toBeDisabled();
    }
    fireEvent.change(field, { target: { value: "탈퇴" } });
    expect(screen.getByRole("button", { name: "탈퇴하기" })).toBeEnabled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it.each(["cancel", "escape", "outside"])("시작 전 %s로 모달을 닫고 다시 열면 입력을 초기화한다", (method) => {
    show(); const modal = openModal();
    fireEvent.change(screen.getByLabelText("확인을 위해 '탈퇴'를 입력하세요"), { target: { value: "탈퇴" } });
    if (method === "cancel") fireEvent.click(within(modal).getByRole("button", { name: "취소" }));
    if (method === "escape") fireEvent.keyDown(document, { key: "Escape" });
    if (method === "outside") fireEvent.click(modal.parentElement!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    openModal();
    expect(screen.getByRole("button", { name: "탈퇴하기" })).toBeDisabled();
  });
  it("모달 내부 클릭으로 닫지 않고 Tab 포커스를 모달 안에 유지한다", () => {
    show(); const modal = openModal();
    fireEvent.click(within(modal).getByText("원본 파일 삭제"));
    expect(modal).toBeVisible();
    const cancel = within(modal).getByRole("button", { name: "취소" });
    cancel.focus(); fireEvent.keyDown(document, { key: "Tab" });
    expect(screen.getByLabelText("확인을 위해 '탈퇴'를 입력하세요")).toHaveFocus();
  });
  it("진행 중 Esc·바깥 클릭·취소를 차단하고 중복 요청을 보내지 않는다", async () => {
    let resolve!: (r: unknown) => void;
    mocks.fetch.mockReturnValue(new Promise((done) => { resolve = done; }));
    show(); const modal = openModal(); confirmAccount();
    expect(modal).toHaveAttribute("aria-busy", "true");
    expect(within(modal).getByRole("button", { name: "취소" })).toBeDisabled();
    expect(within(modal).getByRole("button", { name: "탈퇴 처리 중…" })).toBeDisabled();
    fireEvent.keyDown(document, { key: "Escape" }); fireEvent.click(modal.parentElement!);
    fireEvent.click(within(modal).getByRole("button", { name: "탈퇴 처리 중…" }));
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.replace).not.toHaveBeenCalled();
    await act(async () => resolve(response(204)));
    expect(mocks.fetch).toHaveBeenCalledWith("/api/account", { method: "DELETE" });
    expect(mocks.replace).toHaveBeenCalledWith("/");
    expect(mocks.refresh).toHaveBeenCalled();
    expect(within(modal).getAllByRole("listitem").every((item) => item.getAttribute("aria-label")?.endsWith(": 완료"))).toBe(true);
    expect(within(modal).getByRole("button", { name: "탈퇴 완료" })).toBeDisabled();
    fireEvent.keyDown(document, { key: "Escape" }); fireEvent.click(modal.parentElement!);
    expect(screen.getByRole("dialog")).toBeVisible();
  });
  it.each([
    ["subscription_cancel_failed", "Polar 구독 취소", 0],
    ["storage_delete_failed", "원본 파일 삭제", 1],
    ["account_delete_failed", "계정 · 분석 데이터 삭제", 2],
  ] as const)("%s는 실패 단계와 문구를 표시하고 다시 시도한다", async (code, step, index) => {
    mocks.fetch.mockResolvedValueOnce(response(502, code)).mockResolvedValueOnce(response(204));
    show(); openModal(); confirmAccount();
    expect(await screen.findByRole("alert")).toHaveTextContent(`${step} 단계에서 중단되었습니다.`);
    expect(screen.getByRole("alert")).toHaveTextContent(ERROR_MESSAGES[code]);
    expect(screen.getByLabelText(`${step}: 실패`)).toBeVisible();
    const steps = within(screen.getByRole("dialog")).getAllByRole("listitem");
    for (let i = 0; i < index; i++) expect(steps[i]).toHaveAttribute("aria-label", expect.stringContaining("완료"));
    expect(mocks.replace).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/"));
  });
  it("네트워크 실패는 확인되지 않은 단계를 완료로 표시하지 않고 재시도 안내를 보인다", async () => {
    mocks.fetch.mockRejectedValue(new Error("비공개 서버 응답"));
    show(); openModal(); confirmAccount();
    expect(await screen.findByRole("alert")).toHaveTextContent(ERROR_MESSAGES.internal_error);
    expect(screen.queryByLabelText(/: 완료/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeEnabled();
    expect(screen.queryByText("비공개 서버 응답")).not.toBeInTheDocument();
  });
  it("탈퇴 요청도 세션 만료 시 로그인으로 이동한다", async () => {
    mocks.fetch.mockResolvedValue(response(401, "unauthorized"));
    show(); openModal(); confirmAccount();
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/login"));
  });
});
