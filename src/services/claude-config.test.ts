import { expect, it } from "vitest";
import { CLASSIFY_BATCH_SIZE, CLASSIFY_CONCURRENCY, CLAUDE_MAX_RETRIES, CLAUDE_TIMEOUT_MS } from "./claude-config";

it("잠정 호출 제한은 5분 분석 시간 안에서 측정할 수 있는 값이다", () => {
  expect(CLAUDE_TIMEOUT_MS).toBe(60_000);
  expect(CLAUDE_MAX_RETRIES).toBe(1);
  expect(CLASSIFY_BATCH_SIZE).toBe(100);
  expect(CLASSIFY_CONCURRENCY).toBe(2);
});
