// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { modelFor, mapColumns, classifyMerchants, generateInsights } from "./claude";
import { CLAUDE_MAX_RETRIES, CLAUDE_TIMEOUT_MS } from "./claude-config";
import type { AnalysisSummary, ColumnMapping } from "@/types";

const parse = vi.hoisted(() => vi.fn());
vi.mock("@anthropic-ai/sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@anthropic-ai/sdk")>();
  const Client = Object.assign(vi.fn(function () { return { messages: { parse } }; }), {
    APIConnectionTimeoutError: actual.APIConnectionTimeoutError,
    APIConnectionError: actual.APIConnectionError,
    APIError: actual.APIError,
  });
  return { ...actual, default: Client };
});

const mapping: ColumnMapping = {
  isTransactions: true, isKrw: true, headerRowIndex: 1,
  dateColumn: "거래일", dateFormat: "YYYY.MM.DD", merchantColumn: "가맹점",
  amount: { mode: "single", column: "이용금액", debitIsNegative: false },
};
const summary: AnalysisSummary = {
  totalSpend: 100_000, byCategory: { food: 40_000 }, topMerchants: [{ merchant: "상점", amount: 30_000 }],
  period: { from: "2026-09-01", to: "2026-09-30" }, transactionCount: 8, skippedRows: 0,
};

beforeEach(() => {
  vi.stubEnv("MOCK_SERVICES", "");
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  parse.mockReset();
  vi.mocked(Anthropic).mockClear();
});
afterEach(() => vi.unstubAllEnvs());

describe("Claude 서비스", () => {
  it("플랜에 맞는 환경 모델과 기본 모델을 고른다", () => {
    expect(modelFor("free")).toBe("claude-sonnet-5-5");
    expect(modelFor("pro")).toBe("claude-opus-5-5");
    vi.stubEnv("CLAUDE_MODEL_FREE", "free-test");
    vi.stubEnv("CLAUDE_MODEL_PRO", "pro-test");
    expect(modelFor("free")).toBe("free-test");
    expect(modelFor("pro")).toBe("pro-test");
  });

  it("매핑에 상위 15행과 행 번호만 보내고 SDK 제한을 적용한다", async () => {
    parse.mockResolvedValue({ stop_reason: "end_turn", parsed_output: mapping });
    const rows = [["거래일", "가맹점", "이용금액"], ...Array.from({ length: 20 }, (_, i) => [`2026.09.${i + 1}`, "상점", "1000"])];
    expect(await mapColumns(["9월 명세서"], rows, "free")).toEqual(mapping);
    expect(Anthropic).toHaveBeenCalledWith({ timeout: CLAUDE_TIMEOUT_MS, maxRetries: CLAUDE_MAX_RETRIES, apiKey: "test-key" });
    const request = parse.mock.calls[0][0];
    expect(request.model).toBe("claude-sonnet-5-5");
    expect(request.output_config).toMatchObject({ effort: "low", format: { type: "json_schema" } });
    expect(request.messages[0].content).toContain("0:");
    expect(request.messages[0].content).toContain("14:");
    expect(request.messages[0].content).not.toContain("15:");
    expect(request).not.toHaveProperty("thinking");
    expect(request).not.toHaveProperty("temperature");
  });

  it("실제 헤더에 없는 열 이름을 거부한다", async () => {
    parse.mockResolvedValue({ stop_reason: "end_turn", parsed_output: { ...mapping, merchantColumn: "없는열" } });
    await expect(mapColumns(["제목"], [["거래일", "가맹점", "이용금액"]], "free"))
      .rejects.toMatchObject({ code: "mapping_failed" });
  });

  it("refusal·빈 출력은 사용하지 않는다", async () => {
    parse.mockResolvedValueOnce({ stop_reason: "refusal", parsed_output: mapping });
    await expect(mapColumns(["거래일", "가맹점", "금액"], [], "free")).rejects.toMatchObject({ code: "llm_unavailable" });
    parse.mockResolvedValueOnce({ stop_reason: "end_turn", parsed_output: null });
    await expect(mapColumns(["거래일", "가맹점", "금액"], [], "free")).rejects.toMatchObject({ code: "mapping_failed" });
  });

  it("SDK 시간 초과를 timeout으로 변환한다", async () => {
    parse.mockRejectedValue(new Anthropic.APIConnectionTimeoutError());
    await expect(mapColumns(["거래일", "가맹점", "금액"], [], "free")).rejects.toMatchObject({ code: "timeout" });
  });

  it("MOCK_SERVICES와 키가 없을 때 mock으로 가지 않는다", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    await expect(mapColumns(["거래일", "가맹점", "금액"], [], "free")).rejects.toMatchObject({ code: "llm_unavailable" });
    expect(parse).not.toHaveBeenCalled();
  });

  it("명시적 claude mock은 키 없이도 SDK를 호출하지 않는다", async () => {
    vi.stubEnv("MOCK_SERVICES", "claude");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const result = await mapColumns(["거래일", "가맹점", "금액"], [["2026-09-01", "상점", "1000"]], "free");
    expect(result.isKrw).toBe(true);
    expect(await classifyMerchants(["스타벅스"], "free")).toEqual({ 스타벅스: "cafe" });
    expect(parse).not.toHaveBeenCalled();
  });
});

describe("가맹점 분류", () => {
  it("205개 고유 가맹점을 100개씩 나누고 동시 호출을 최대 2개로 제한한다", async () => {
    const pending: Array<(value: unknown) => void> = [];
    parse.mockImplementation(() => new Promise((resolve) => pending.push(resolve)));
    const merchants = Array.from({ length: 205 }, (_, i) => `상점${i}`);
    const task = classifyMerchants([...merchants, merchants[0]], "pro");
    await vi.waitFor(() => expect(parse).toHaveBeenCalledTimes(2));
    expect(parse.mock.calls[0][0].messages[0].content).not.toContain("상점100");
    pending[0]({ stop_reason: "end_turn", parsed_output: { items: [] } });
    await vi.waitFor(() => expect(parse).toHaveBeenCalledTimes(3));
    expect(parse.mock.calls[2][0].messages[0].content).toContain("상점204");
    pending[1]({ stop_reason: "end_turn", parsed_output: { items: [] } });
    pending[2]({ stop_reason: "end_turn", parsed_output: { items: [] } });
    expect(Object.keys(await task)).toHaveLength(205);
    expect(parse.mock.calls.every(([request]) => request.output_config.effort === "low" && request.model === "claude-opus-5-5")).toBe(true);
  });

  it("누락·알 수 없는 가맹점과 enum 밖 카테고리를 other로 둔다", async () => {
    parse.mockResolvedValue({ stop_reason: "end_turn", parsed_output: { items: [
      { merchant: "스타벅스", category: "cafe" }, { merchant: "편의점", category: "wrong" },
      { merchant: "요청하지 않음", category: "food" },
    ] } });
    expect(await classifyMerchants(["스타벅스", "편의점", "미분류"], "free"))
      .toEqual({ 스타벅스: "cafe", 편의점: "other", 미분류: "other" });
  });

  it("SDK가 enum 위반 응답을 파싱 단계에서 거부해도 해당 배치는 other로 둔다", async () => {
    let invalidEnum: unknown;
    try { z.enum(["food"]).parse("wrong"); } catch (error) { invalidEnum = error; }
    parse.mockRejectedValue(invalidEnum);
    expect(await classifyMerchants(["가맹점"], "free")).toEqual({ 가맹점: "other" });
  });
});

it("인사이트에는 집계값만 보내며 Pro 모델과 medium effort를 쓴다", async () => {
  parse.mockResolvedValue({ stop_reason: "end_turn", parsed_output: { insights: [
    { title: "지출 점검", body: "식비를 점검하세요.", monthlySaving: 3000 },
    { title: "정기 결제", body: "구독을 확인하세요.", monthlySaving: 2000 },
    { title: "다음 달", body: "계획을 세우세요.", monthlySaving: 1000 },
  ] } });
  expect(await generateInsights({ summary, detections: { recurringCount: 1, anomalyCount: 2 } })).toHaveLength(3);
  const request = parse.mock.calls[0][0];
  expect(request.model).toBe("claude-opus-5-5");
  expect(request.output_config.effort).toBe("medium");
  expect(request.messages[0].content).toContain("100000");
  expect(request.messages[0].content).not.toContain("상점");
});

it("인사이트의 음수 절약 금액은 거부한다", async () => {
  parse.mockResolvedValue({ stop_reason: "end_turn", parsed_output: { insights: [
    { title: "점검", body: "확인", monthlySaving: -1 },
    { title: "점검", body: "확인", monthlySaving: 0 },
    { title: "점검", body: "확인", monthlySaving: 0 },
  ] } });
  await expect(generateInsights({ summary, detections: { recurringCount: 0, anomalyCount: 0 } }))
    .rejects.toMatchObject({ code: "llm_unavailable" });
});
