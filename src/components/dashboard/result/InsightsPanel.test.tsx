import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { InsightsPanel } from "./InsightsPanel";
import { ResultContext } from "./result-context";
import { ERROR_MESSAGES } from "@/messages/errors";

afterEach(() => vi.unstubAllGlobals());

it("완료된 빈 인사이트 배열은 재생성 버튼 없이 월 0원으로 표시한다", () => {
  render(<ResultContext.Provider value={{ mode: "user", category: null, setCategory: vi.fn() }}>
    <InsightsPanel view={{ id: "empty-insights", status: "completed", insights: [] }} />
  </ResultContext.Provider>);
  expect(screen.getByText("월 ₩0")).toBeVisible();
  expect(screen.queryByRole("button", { name: "인사이트 생성" })).not.toBeInTheDocument();
});

it("다른 분석으로 바뀐 뒤 이전 요청이 끝나도 인사이트를 섞지 않는다", async () => {
  let resolve!: (response: Response) => void;
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((done) => { resolve = done; })));
  const { rerender } = render(<InsightsPanel view={{ id: "first", status: "completed", insights: null }} />);
  fireEvent.click(screen.getByRole("button", { name: "인사이트 생성" }));
  rerender(<InsightsPanel view={{ id: "second", status: "completed", insights: null }} />);
  await act(async () => { resolve(Response.json({ insights: [{ title: "이전 분석", body: "이전 내용", monthlySaving: 100 }] })); });
  expect(screen.queryByText("이전 분석")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "인사이트 생성" })).toBeVisible();
});

it("알 수 없는 오류 코드에는 공통 문구를 표시한다", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: { code: "unknown-detail" } }, { status: 500 })));
  render(<InsightsPanel view={{ id: "unknown", status: "completed", insights: null }} />);
  fireEvent.click(screen.getByRole("button", { name: "인사이트 생성" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(ERROR_MESSAGES.internal_error);
  expect(screen.queryByText("unknown-detail")).not.toBeInTheDocument();
});
