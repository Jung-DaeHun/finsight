/** go-live 실측 기준 호출 제한. Pro 최대 입력의 240초 목표에 맞춰 분류를 동시 3개 실행한다. */
export const CLAUDE_TIMEOUT_MS = 60_000;
export const CLAUDE_MAX_RETRIES = 1;
export const CLASSIFY_BATCH_SIZE = 100;
export const CLASSIFY_CONCURRENCY = 3;
/** Sonnet·Opus 5.5는 thinking이 항상 켜져 있어 thinking 토큰도 포함된다. 비스트리밍 요청의 권장 상한. */
export const CLAUDE_MAX_TOKENS = 16_000;
