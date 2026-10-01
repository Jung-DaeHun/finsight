# Step 5: claude-service

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/AGENTS.md`
- `/docs/ARCHITECTURE.md` (5.2 분석 흐름 6·8단계, 5.2.2 실행 시간, 5.4 서비스 인터페이스, 5.5 에러 처리, 6절 E4·E7·E9·E10·E11, 11.2 mock 모드)
- `/docs/ADR.md` (ADR-005, ADR-006, ADR-008, ADR-013)
- 이전 step 산출물: `src/types/`(ColumnMapping, Category, CATEGORIES, Insight, Plan, AnalysisSummary, MonthlyTrend), `src/lib/sheet/`(readRows·normalize·SheetError), `src/lib/mock.ts`(isMocked), `src/lib/log.ts`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

테스트를 먼저 작성하고 통과하는 구현을 작성하라 (TDD). 단위 테스트는 Anthropic SDK를 mock한다(실제 API 호출 금지).

1. **설치**: `@anthropic-ai/sdk`, `zod`(없으면). `src/services/claude.ts` 상단에 `import 'server-only'` (`server-only` 패키지 설치, Vitest에서는 alias로 빈 모듈 처리)
2. **설정 상수** (`src/services/claude-config.ts`) — 잠정값. 실측은 go-live step에서 한다
   - `CLAUDE_TIMEOUT_MS = 60_000`, `CLAUDE_MAX_RETRIES = 1`, `CLASSIFY_BATCH_SIZE = 100`, `CLASSIFY_CONCURRENCY = 2`
3. **모델 선택**: `modelFor(plan: Plan): string` — free → `process.env.CLAUDE_MODEL_FREE ?? 'claude-sonnet-5-5'`, pro → `process.env.CLAUDE_MODEL_PRO ?? 'claude-opus-5-5'`
4. **공개 함수** (ARCHITECTURE 5.4 시그니처 그대로)
   ```ts
   mapColumns(header: string[], sampleRows: string[][], plan: Plan): Promise<ColumnMapping>
   classifyMerchants(merchants: string[], plan: Plan): Promise<Record<string, Category>>
   generateInsights(input: { summary: AnalysisSummary; detections: { recurringCount: number; anomalyCount: number }; trend?: MonthlyTrend }): Promise<Insight[]>
   ```
   - `isMocked('claude')`이면 mock 구현, 아니면 실제 구현. **API 키가 없다는 이유로 mock으로 넘어가지 마라**(키가 없으면 실제 구현이 실패 → `llm_unavailable`)
5. **실제 구현**
   - `new Anthropic({ timeout: CLAUDE_TIMEOUT_MS, maxRetries: CLAUDE_MAX_RETRIES })`
   - 구조화 출력: `client.messages.parse({ model, max_tokens, messages, output_config: { format: zodOutputFormat(Schema), effort } })` (`import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'`). `parsed_output`이 null이거나 `stop_reason === 'refusal'`이면 실패. effort는 매핑·분류 `'low'`, 인사이트 `'medium'`
   - `thinking`·`temperature`·`budget_tokens`·assistant prefill을 보내지 마라 (Sonnet 5.5·Opus 5.5에서 400)
   - **mapColumns**: 행 인덱스가 붙은 상위 행(최대 15행: 제목·헤더 후보 포함)과 샘플만 보낸다. 시스템 프롬프트: 한국 카드·은행 명세서의 날짜·가맹점·설명·금액 열을 고르고, 금액은 **원화 열**(해외 결제는 원화 환산 열, 할부는 이번 달 청구액 열)을 고른다. 원화 금액 열이 없으면 `isKrw: false`, 거래내역이 아니면 `isTransactions: false`. 응답 zod 스키마는 `ColumnMapping`과 일치시키고 결과를 다시 검증: 열 이름이 실제 헤더에 없으면 `mapping_failed`
   - **classifyMerchants**: 고유 가맹점을 `CLASSIFY_BATCH_SIZE`씩 나눠 동시 `CLASSIFY_CONCURRENCY`개로 호출. 응답 카테고리는 `z.enum(CATEGORIES)`만 허용. 누락·알 수 없는 가맹점은 `'other'`
   - **generateInsights**: 항상 Pro 모델. 집계값(summary·detections 건수·trend)만 보내고 거래 원본·파일 내용은 보내지 않는다. 한국어 3~5개, 스키마 `{ title, body, monthlySaving(0 이상 정수) }`
   - 실패 변환: `src/services/claude-errors.ts`에 `ClaudeServiceError { code: 'llm_unavailable' | 'timeout' | 'mapping_failed' }`. SDK의 타입별 예외(`Anthropic.APIConnectionTimeoutError` → timeout, 그 외 API/연결 오류 → llm_unavailable)로 구분한다. 에러 메시지 원문·프롬프트 내용을 로그에 남기지 마라
6. **mock 구현** (`src/services/claude-mock.ts`)
   - mapColumns: 헤더 이름 키워드(`이용일|거래일|날짜`, `가맹점|이용처|내용|적요`, `이용금액|금액|원화|청구금액`, `출금|입금`)로 결정론적 매핑. 원화 열을 못 찾으면 `isKrw: false`
   - classifyMerchants: 키워드 사전(예: `스타벅스|커피` → cafe, `배민|요기요|쿠팡이츠` → food, `넷플릭스|유튜브|멜론` → subscription …), 없으면 other
   - generateInsights: 고정 한국어 인사이트 3개(입력 summary의 숫자를 문장에 넣되 `monthlySaving`은 고정 비율 계산)
7. **응답 시간 실측 스크립트** `scripts/measure-claude.mjs`(또는 `.ts` + tsx): 가맹점 100개 분류·매핑 1회를 Sonnet·Opus로 각각 호출해 소요 시간을 출력. **이 step에서는 실행하지 않는다**(API 키 없음). go-live step이 실행한다. `package.json`에 `"measure:claude"` 스크립트로 등록
8. **테스트**: 모델 선택, mock 매핑 fixture(국내 카드 헤더, 은행 입출금 분리, 해외 원화 환산 열 포함, 외화 전용 → isKrw false — R7), 배치 분할·동시성 상한, enum 밖 카테고리 → other, 매핑 열 이름 검증 실패 → mapping_failed, SDK 타임아웃 예외 → timeout, `MOCK_SERVICES` 미설정 + 키 없음이 mock으로 가지 않음

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run deploy
npm run smoke
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - ADR 기술 스택을 벗어나지 않았는가?
   - AGENTS.md CRITICAL 규칙을 위반하지 않았는가? (`@anthropic-ai/sdk` import가 `src/services/` 밖에 없는지 `grep -rn "@anthropic-ai/sdk" src/`)
3. 결과에 따라 `phases/0-mvp/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"` (잠정 timeout·배치 값 포함)
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- LLM에게 합계·건수·추이를 계산시키지 마라. 이유: 금액 계산은 결정론적 코드로 한다(ADR-006). `monthlySaving`은 제안 금액일 뿐 집계값이 아니다.
- 파일 원본 전체나 전체 거래 목록을 프롬프트에 넣지 마라. 이유: 비용·지연·개인정보. 매핑은 상위 행 샘플, 분류는 고유 가맹점명, 인사이트는 집계값만.
- 프롬프트·응답·가맹점명을 로그에 남기지 마라. 이유: AGENTS.md 로깅 규칙.
- `ANTHROPIC_API_KEY` 유무로 mock을 자동 선택하지 마라. 이유: 운영에서 키 누락 시 가짜 결과가 조용히 나간다.
- 실측 스크립트를 이 step에서 실행하지 마라. 이유: API 키는 go-live 단계에서 준비된다.
- 기존 테스트를 깨뜨리지 마라
