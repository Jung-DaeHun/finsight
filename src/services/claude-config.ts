/** go-live에서 실측해 확정할 잠정 호출 제한. */
export const CLAUDE_TIMEOUT_MS = 60_000;
export const CLAUDE_MAX_RETRIES = 1;
export const CLASSIFY_BATCH_SIZE = 100;
export const CLASSIFY_CONCURRENCY = 2;
/** Sonnet·Opus 5.5는 thinking이 항상 켜져 있어 thinking 토큰도 포함된다. 비스트리밍 요청의 권장 상한. */
export const CLAUDE_MAX_TOKENS = 16_000;
