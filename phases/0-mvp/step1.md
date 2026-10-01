# Step 1: core-types

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/AGENTS.md`
- `/docs/ARCHITECTURE.md` (5.3 데이터베이스, 5.3.1 접근 권한, 5.4 인터페이스, 5.5 에러 처리)
- `/docs/ADR.md` (ADR-003, ADR-004, ADR-010)
- `/docs/USER_FLOW.md` (시나리오 3.4, 6.1)
- `/docs/design/fs-app.jsx`, `/docs/design/fs-public.jsx` — `FS_ERR` 등 에러 문구를 `grep`으로 찾아 참고
- 이전 step 산출물: `package.json`, `vitest.config.ts`, `next.config.ts`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

테스트를 먼저 작성하고 통과하는 구현을 작성하라 (TDD).

1. **`src/types/errors.ts`** — `ANALYSIS_ERROR_CODES`, `API_ERROR_CODES`를 `as const` 배열로 두고 `AnalysisErrorCode`, `ApiErrorCode` 타입을 파생. 값은 ARCHITECTURE 5.4 그대로
2. **`src/types/` 도메인 타입** — ARCHITECTURE 5.4의 `Plan`, `AnalysisStatus`, `Category`(5.3의 15개 enum, `CATEGORIES` 배열에서 파생), `ReadRowsResult`, `ColumnMapping`, `Transaction`, `TransactionView`, `AnalysisSummary`, `MonthlyTrend`, `AnalysisView`. 문서에 없는 타입은 아래로 정의:
   ```ts
   type RawTx = Omit<Transaction, 'category' | 'isRecurring' | 'anomalyType'>   // normalize 결과
   interface Insight { title: string; body: string; monthlySaving: number }      // 원 단위 정수, 0 이상
   interface SubscriptionRow { status: string; cancelAtPeriodEnd: boolean; currentPeriodEnd: string | null }
   interface AnalysisRow {   // analyses 테이블 row (camelCase)
     id: string; userId: string; status: AnalysisStatus; errorCode: AnalysisErrorCode | null
     failedUpload: { id: string; filename: string } | null
     summary: AnalysisSummary | null
     detections: { recurringCount: number; anomalyCount: number } | null
     insights: Insight[] | null; createdAt: string; completedAt: string | null
   }
   ```
3. **`src/messages/errors.ts`** — `Record<AnalysisErrorCode | ApiErrorCode, string>` 한국어 문구. 디자인에 문구가 있으면 그대로 쓴다. `file_encrypted`는 암호 해제 방법(엑셀에서 열어 암호 해제 후 다시 저장)을, `monthly_limit`은 다음 달 1일(UTC)에 초기화됨을 안내
4. **`src/lib/api-error.ts`** — `apiError(code: ApiErrorCode | AnalysisErrorCode, status: number, extra?: { analysisId?: string; uploadId?: string }): Response` → body `{ error: { code, ...extra } }`
5. **`src/lib/log.ts`** — `logError(event: string, meta: { code?: string; analysisId?: string; durationMs?: number }): void`. meta 타입에 이 세 키만 허용해 파일 내용·가맹점명이 들어갈 자리를 타입으로 막는다
6. **`src/lib/plan.ts`**
   - `resolvePlan(sub: SubscriptionRow | null): Plan` — `active | trialing | past_due` → `'pro'`, 나머지와 null → `'free'`
   - `limits(plan)` — free `{ maxFiles: 1, maxBytesPerFile: 1_048_576, maxSheetRows: 1200, monthlyAnalyses: 5 }`, pro `{ maxFiles: 3, ..., monthlyAnalyses: 50 }`
   - `toAnalysisView({ row, transactions, trend }, plan): AnalysisView` — **허용 필드만 골라 새 객체를 만든다** (spread로 row를 복사하지 마라)
     - 공통: `id`, `status`
     - `failed`: `errorCode`, `failedUpload`(id·filename만)만 추가
     - `processing`: 메타데이터만
     - `completed` Free: `summary`, `transactions`(각 항목에서 `isRecurring`·`anomalyType` 제거한 `TransactionView`), `detections: { recurringCount, anomalyCount }`(items 없음). `trend`·`insights` 키 자체가 없어야 한다(저장된 insights가 있어도)
     - `completed` Pro: 위 + `detections.items`(isRecurring 또는 anomalyType이 있는 거래), `trend`, `insights`(없으면 null)
7. **테스트** (`src/lib/plan.test.ts` 등)
   - resolvePlan 상태별, limits 값
   - toAnalysisView: Free completed 결과를 `JSON.stringify`했을 때 `isRecurring`, `anomalyType`, `items`, `trend`, `insights` 문자열이 없음 (R4)
   - Pro completed에 items·trend·insights 포함, processing/failed에 summary·transactions 없음 (R8)
   - messages/errors.ts에 모든 에러 코드 문구가 있음

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
   - AGENTS.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/0-mvp/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- `toAnalysisView`에서 `{...row}`처럼 row를 통째로 복사한 뒤 필드를 지우지 마라. 이유: 새 컬럼이 생기면 자동으로 클라이언트에 새어 나간다.
- 에러 문구를 컴포넌트나 API 라우트에 직접 쓰지 마라. 이유: 문구는 `messages/errors.ts` 한 곳에 둔다.
- `console.log`/`console.error`를 `logError` 밖에서 쓰지 마라. 이유: 파일 내용 유출 방지.
- DB·Supabase 코드를 만들지 마라. 이유: db-schema step에서 만든다.
- 기존 테스트를 깨뜨리지 마라
