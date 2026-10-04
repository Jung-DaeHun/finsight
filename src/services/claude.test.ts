// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Anthropic from "@anthropic-ai/sdk";
import { modelFor, mapColumns, classifyMerchants, generateInsights } from "./claude";
import { CLAUDE_MAX_RETRIES, CLAUDE_MAX_TOKENS, CLAUDE_TIMEOUT_MS } from "./claude-config";
import type { AnalysisSummary, ColumnMapping } from "@/types";

const parse = vi.hoisted(() => vi.fn());
vi.mock("@anthropic-ai/sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@anthropic-ai/sdk")>();
  const Client = Object.assign(vi.fn(function () { return { messages: { parse } }; }), {
    APIConnectionTimeoutError: actual.APIConnectionTimeoutError,
    APIConnectionError: actual.APIConnectionError,
    APIError: actual.APIError,
    AnthropicError: actual.AnthropicError,
  });
  return { ...actual, default: Client };
});

const mapping: ColumnMapping = {
  isTransactions: true, isKrw: true, headerRowIndex: 1,
  dateColumn: "거래일", dateFormat: "YYYY.MM.DD", merchantColumn: "가맹점",
  amount: { mode: "single", column: "이용금액", debitIsNegative: false },
};
// messages.parse는 출력이 스키마에 맞지 않으면 ZodError 대신 AnthropicError(APIError 아님)를 던진다.
const parseFailure = () => new Anthropic.AnthropicError("Failed to parse structured output");
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

  it("빈 모델 env는 기본 모델로 대체한다", () => {
    vi.stubEnv("CLAUDE_MODEL_FREE", "");
    vi.stubEnv("CLAUDE_MODEL_PRO", "  ");
    expect(modelFor("free")).toBe("claude-sonnet-5-5");
    expect(modelFor("pro")).toBe("claude-opus-5-5");
  });

  it("매핑에 상위 15행과 행 번호만 보내고 SDK 제한을 적용한다", async () => {
    parse.mockResolvedValue({ stop_reason: "end_turn", parsed_output: mapping });
    const rows = [["거래일", "가맹점", "이용금액"], ...Array.from({ length: 20 }, (_, i) => [`2026.09.${i + 1}`, "상점", "1000"])];
    expect(await mapColumns(["9월 명세서"], rows, "free")).toEqual(mapping);
    // SDK 디버그 로그가 요청 본문(가맹점명·파일 행)을 남기지 않도록 로그를 끈다.
    expect(Anthropic).toHaveBeenCalledWith({
      timeout: CLAUDE_TIMEOUT_MS, maxRetries: CLAUDE_MAX_RETRIES, apiKey: "test-key", logLevel: "off",
    });
    const request = parse.mock.calls[0][0];
    expect(request.model).toBe("claude-sonnet-5-5");
    expect(request.max_tokens).toBe(CLAUDE_MAX_TOKENS);
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

  it("SDK가 매핑 응답을 스키마로 파싱하지 못하면 mapping_failed로 변환한다", async () => {
    parse.mockRejectedValue(parseFailure());
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
  it("405개 고유 가맹점을 100개씩 나누고 동시 호출을 최대 3개로 제한한다", async () => {
    const pending: Array<(value: unknown) => void> = [];
    parse.mockImplementation(() => new Promise((resolve) => pending.push(resolve)));
    const merchants = Array.from({ length: 405 }, (_, i) => `상점${i}`);
    const task = classifyMerchants([...merchants, merchants[0]], "pro");
    await vi.waitFor(() => expect(parse).toHaveBeenCalledTimes(3));
    expect(parse.mock.calls[0][0].messages[0].content).not.toContain("상점100");
    pending[0]({ stop_reason: "end_turn", parsed_output: { items: [] } });
    await vi.waitFor(() => expect(parse).toHaveBeenCalledTimes(4));
    pending[1]({ stop_reason: "end_turn", parsed_output: { items: [] } });
    await vi.waitFor(() => expect(parse).toHaveBeenCalledTimes(5));
    expect(parse.mock.calls[4][0].messages[0].content).toContain("상점404");
    pending[2]({ stop_reason: "end_turn", parsed_output: { items: [] } });
    pending[3]({ stop_reason: "end_turn", parsed_output: { items: [] } });
    pending[4]({ stop_reason: "end_turn", parsed_output: { items: [] } });
    expect(Object.keys(await task)).toHaveLength(405);
    expect(parse.mock.calls.every(([request]) => request.output_config.effort === "low" && request.model === "claude-opus-5-5"
      && request.max_tokens === CLAUDE_MAX_TOKENS)).toBe(true);
  });

  it("한 배치가 실패하면 남은 배치를 호출하지 않는다", async () => {
    const pending: Array<(value: unknown) => void> = [];
    parse.mockRejectedValueOnce(new Anthropic.APIConnectionError({ message: "down" }))
      .mockImplementation(() => new Promise((resolve) => pending.push(resolve)));
    const merchants = Array.from({ length: 405 }, (_, i) => `상점${i}`);
    await expect(classifyMerchants(merchants, "free")).rejects.toMatchObject({ code: "llm_unavailable" });
    pending[0]({ stop_reason: "end_turn", parsed_output: { items: [] } });
    pending[1]({ stop_reason: "end_turn", parsed_output: { items: [] } });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(parse).toHaveBeenCalledTimes(3);
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
    parse.mockRejectedValue(parseFailure());
    expect(await classifyMerchants(["가맹점"], "free")).toEqual({ 가맹점: "other" });
  });
});

it("인사이트에는 집계값·상위 가맹점·코드로 묶은 탐지 거래를 보내며 Pro 모델과 medium effort를 쓴다", async () => {
  parse.mockResolvedValue({ stop_reason: "end_turn", parsed_output: { insights: [
    { title: "지출 점검", body: "식비를 점검하세요.", monthlySaving: 3000 },
    { title: "정기 결제", body: "구독을 확인하세요.", monthlySaving: 2000 },
    { title: "다음 달", body: "계획을 세우세요.", monthlySaving: 1000 },
  ] } });
  const dup = { occurredOn: "2026-09-12", merchant: "넥슨", amount: 27000, direction: "debit", category: "other", isRecurring: false, anomalyType: "duplicate" } as const;
  expect(await generateInsights({ summary, detections: { recurringCount: 0, anomalyCount: 2 }, flagged: [dup, dup] })).toHaveLength(3);
  const request = parse.mock.calls[0][0];
  expect(request.model).toBe("claude-opus-5-5");
  expect(request.max_tokens).toBe(CLAUDE_MAX_TOKENS);
  expect(request.output_config.effort).toBe("medium");
  const payload = JSON.parse(request.messages[0].content);
  expect(payload.totalSpend).toBe(100000);
  expect(payload.topMerchants).toEqual([{ merchant: "상점", amount: 30000 }]);
  expect(payload.flagged).toEqual([{ type: "duplicate", merchant: "넥슨", amount: 27000, count: 2, total: 54000, dates: ["2026-09-12"] }]);
  expect(request.system).toContain("가맹점");
  // 여러 값을 더한 새 금액(예: 두 가맹점 합계)을 본문에 만들지 않도록 금지한다.
  expect(request.system).toContain("더하거나 빼서 새 숫자를 만들지 마세요");
});

it("인사이트의 음수 절약 금액은 거부한다", async () => {
  parse.mockResolvedValue({ stop_reason: "end_turn", parsed_output: { insights: [
    { title: "점검", body: "확인", monthlySaving: -1 },
    { title: "점검", body: "확인", monthlySaving: 0 },
    { title: "점검", body: "확인", monthlySaving: 0 },
  ] } });
  await expect(generateInsights({ summary, detections: { recurringCount: 0, anomalyCount: 0 }, flagged: [] }))
    .rejects.toMatchObject({ code: "llm_unavailable" });
});
