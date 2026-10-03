import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { CATEGORIES } from "@/types";
import type { AnalysisSummary, Category, ColumnMapping, Insight, MonthlyTrend, Plan } from "@/types";
import { isMocked } from "@/lib/mock";
import { CLASSIFY_BATCH_SIZE, CLASSIFY_CONCURRENCY, CLAUDE_MAX_RETRIES, CLAUDE_TIMEOUT_MS } from "./claude-config";
import { ClaudeServiceError, type ClaudeErrorCode } from "./claude-errors";
import * as mock from "./claude-mock";

const CategorySchema = z.enum(CATEGORIES);
const MappingSchema = z.object({
  isTransactions: z.boolean(), isKrw: z.boolean(), headerRowIndex: z.number().int().nonnegative(),
  dateColumn: z.string(), dateFormat: z.string(), assumedYear: z.number().int().optional(),
  merchantColumn: z.string(), descriptionColumn: z.string().optional(),
  amount: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("single"), column: z.string(), debitIsNegative: z.boolean() }),
    z.object({ mode: z.literal("split"), debitColumn: z.string(), creditColumn: z.string() }),
  ]),
});
const ClassificationsSchema = z.object({ items: z.array(z.object({ merchant: z.string(), category: CategorySchema })) });
const ClassificationEntriesSchema = z.object({ items: z.array(z.object({ merchant: z.string(), category: z.unknown() })) });
const InsightsSchema = z.object({ insights: z.array(z.object({
  title: z.string().min(1), body: z.string().min(1), monthlySaving: z.number().int().nonnegative(),
})).min(3).max(5) });

type InsightInput = {
  summary: AnalysisSummary;
  detections: { recurringCount: number; anomalyCount: number };
  trend?: MonthlyTrend;
};

export function modelFor(plan: Plan): string {
  return plan === "free"
    ? process.env.CLAUDE_MODEL_FREE ?? "claude-sonnet-5-5"
    : process.env.CLAUDE_MODEL_PRO ?? "claude-opus-5-5";
}

function client(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new ClaudeServiceError("llm_unavailable");
  return new Anthropic({ apiKey, timeout: CLAUDE_TIMEOUT_MS, maxRetries: CLAUDE_MAX_RETRIES });
}

async function structuredOutput<T extends z.ZodType>(
  schema: T, model: string, system: string, content: string,
  effort: "low" | "medium", maxTokens: number, invalidCode: ClaudeErrorCode,
  passThroughZodError = false,
): Promise<unknown> {
  try {
    const response = await client().messages.parse({
      model, max_tokens: maxTokens, system, messages: [{ role: "user", content }],
      output_config: { format: zodOutputFormat(schema), effort },
    });
    if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") {
      throw new ClaudeServiceError("llm_unavailable");
    }
    if (response.parsed_output === null || response.parsed_output === undefined) {
      throw new ClaudeServiceError(invalidCode);
    }
    return response.parsed_output;
  } catch (error) {
    if (error instanceof ClaudeServiceError) throw error;
    if (error instanceof Anthropic.APIConnectionTimeoutError) throw new ClaudeServiceError("timeout");
    if (error instanceof Anthropic.APIError || error instanceof Anthropic.APIConnectionError) {
      throw new ClaudeServiceError("llm_unavailable");
    }
    if (error instanceof z.ZodError) {
      if (passThroughZodError) throw error;
      throw new ClaudeServiceError(invalidCode);
    }
    throw new ClaudeServiceError("llm_unavailable");
  }
}

function exactHeaderColumn(header: string[], name: string): boolean {
  return Boolean(name.trim()) && header.filter((cell) => cell.trim() === name.trim()).length === 1;
}

function validateMapping(value: unknown, rows: string[][]): ColumnMapping {
  const parsed = MappingSchema.safeParse(value);
  if (!parsed.success) throw new ClaudeServiceError("mapping_failed");
  const mapping = parsed.data;
  if (!mapping.isTransactions || !mapping.isKrw) return mapping;
  const header = rows[mapping.headerRowIndex];
  const columns = [mapping.dateColumn, mapping.merchantColumn,
    ...(mapping.descriptionColumn ? [mapping.descriptionColumn] : []),
    ...(mapping.amount.mode === "single" ? [mapping.amount.column] : [mapping.amount.debitColumn, mapping.amount.creditColumn])];
  const supportedFormats = ["YYYY-MM-DD", "YYYY.MM.DD", "YYYY/MM/DD", "YYYYMMDD", "YYYY-M-D", "YYYY년 M월 D일", "MM/DD/YYYY", "DD/MM/YYYY", "MM/DD"];
  if (!header || !supportedFormats.includes(mapping.dateFormat) ||
      (mapping.dateFormat === "MM/DD" && (!mapping.assumedYear || mapping.assumedYear < 1 || mapping.assumedYear > 9999)) ||
      !columns.every((name) => exactHeaderColumn(header, name))) {
    throw new ClaudeServiceError("mapping_failed");
  }
  return mapping;
}

export async function mapColumns(header: string[], sampleRows: string[][], plan: Plan): Promise<ColumnMapping> {
  if (isMocked("claude")) return mock.mapColumns(header, sampleRows, plan);
  const rows = [header, ...sampleRows].slice(0, 15);
  const system = "한국 카드·은행 명세서의 날짜·가맹점·설명·금액 열을 매핑하세요. headerRowIndex는 제공된 0부터 시작하는 실제 행 번호입니다. 금액은 반드시 원화(KRW) 열을 고르세요. 해외 결제는 원화 환산 열, 할부는 이번 달 청구액 열을 고르세요. 원화 금액 열이 없으면 isKrw=false, 거래내역이 아니면 isTransactions=false로 답하세요. 해당하지 않는 문자열 필드는 빈 문자열로 채우세요. 날짜 형식은 예시 값에 맞춰 YYYY-MM-DD, YYYY.MM.DD, YYYY/MM/DD, YYYYMMDD, YYYY-M-D, YYYY년 M월 D일, MM/DD/YYYY, DD/MM/YYYY, MM/DD 중에서 고르세요. 연도가 없는 MM/DD에는 제목의 연도나 합리적인 assumedYear를 넣으세요. 합계나 수치 계산은 하지 마세요.";
  const content = `상위 행(원래 행 번호 포함):\n${rows.map((row, index) => `${index}: ${JSON.stringify(row)}`).join("\n")}`;
  return validateMapping(await structuredOutput(MappingSchema, modelFor(plan), system, content, "low", 2048, "mapping_failed"), rows);
}

async function classifyBatch(merchants: string[], plan: Plan): Promise<Record<string, Category>> {
  let value: unknown;
  try {
    value = await structuredOutput(
      ClassificationsSchema, modelFor(plan),
      "한국어 가맹점명을 지정된 카테고리 enum 중 하나로 분류하세요. 제공되지 않은 가맹점은 추가하지 마세요. 숫자 계산을 하지 마세요.",
      JSON.stringify({ merchants }), "low", 4096, "llm_unavailable", true,
    );
  } catch (error) {
    // SDK가 enum 위반 응답을 파싱 단계에서 거부한 경우 이 배치만 other로 둔다.
    if (error instanceof z.ZodError) {
      return Object.fromEntries(merchants.map((merchant) => [merchant, "other" as Category]));
    }
    throw error;
  }
  const entries = ClassificationEntriesSchema.safeParse(value);
  if (!entries.success) throw new ClaudeServiceError("llm_unavailable");
  const allowed = new Set(merchants);
  const result: Record<string, Category> = Object.fromEntries(merchants.map((merchant) => [merchant, "other"]));
  for (const item of entries.data.items) {
    if (!allowed.has(item.merchant)) continue;
    const category = CategorySchema.safeParse(item.category);
    if (category.success) result[item.merchant] = category.data;
  }
  return result;
}

export async function classifyMerchants(merchants: string[], plan: Plan): Promise<Record<string, Category>> {
  if (isMocked("claude")) return mock.classifyMerchants(merchants, plan);
  const unique = [...new Set(merchants)];
  if (unique.length === 0) return {};
  const batches: string[][] = [];
  for (let i = 0; i < unique.length; i += CLASSIFY_BATCH_SIZE) batches.push(unique.slice(i, i + CLASSIFY_BATCH_SIZE));
  let nextBatch = 0;
  const workers = Array.from({ length: Math.min(CLASSIFY_CONCURRENCY, batches.length) }, async () => {
    const outputs: Record<string, Category>[] = [];
    while (nextBatch < batches.length) {
      const batch = batches[nextBatch++];
      outputs.push(await classifyBatch(batch, plan));
    }
    return outputs;
  });
  return Object.assign({}, ...(await Promise.all(workers)).flat());
}

export async function generateInsights(input: InsightInput): Promise<Insight[]> {
  if (isMocked("claude")) return mock.generateInsights(input);
  const { summary, detections, trend } = input;
  // 상위 가맹점명이나 원본 거래는 보내지 않는다. 금액과 탐지 건수는 코드가 계산한 값만 사용한다.
  const aggregate = {
    totalSpend: summary.totalSpend, byCategory: summary.byCategory, period: summary.period,
    transactionCount: summary.transactionCount, skippedRows: summary.skippedRows,
    detections, ...(trend ? { trend } : {}),
  };
  const value = await structuredOutput(
    InsightsSchema, modelFor("pro"),
    "주어진 집계값만 바탕으로 한국어 절약 인사이트 3~5개를 작성하세요. 합계·추이·탐지 건수를 새로 계산하지 마세요. monthlySaving은 0원 이상의 정수 제안 금액이며 실제 집계값으로 표현하지 마세요.",
    JSON.stringify(aggregate), "medium", 1536, "llm_unavailable",
  );
  const parsed = InsightsSchema.safeParse(value);
  if (!parsed.success) throw new ClaudeServiceError("llm_unavailable");
  return parsed.data.insights;
}
