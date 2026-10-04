import { expect, it } from "vitest";
import { CLASSIFY_BATCH_SIZE, CLASSIFY_CONCURRENCY, CLAUDE_MAX_RETRIES, CLAUDE_TIMEOUT_MS } from "./claude-config";

it("실측 후 확정한 호출 제한은 60초 timeout·100개 배치·동시 3개다", () => {
  expect(CLAUDE_TIMEOUT_MS).toBe(60_000);
  expect(CLAUDE_MAX_RETRIES).toBe(1);
  expect(CLASSIFY_BATCH_SIZE).toBe(100);
  expect(CLASSIFY_CONCURRENCY).toBe(3);
});
