# 아키텍처

> 구조·데이터·인터페이스·실행 계획·검증의 원본이다. 절 번호(5.x, 6, 7, 10, 11, 12)는 step 문서에서 그대로 참조한다. 제품 범위는 `docs/PRD.md`, 흐름·시나리오는 `docs/USER_FLOW.md`. 스택·결정의 이유는 `docs/ADR.md`.

### 5.1 디렉토리 구조
```
src/
├── app/
│   ├── page.tsx                     # 랜딩
│   ├── login/ signup/ reset-password/
│   ├── dashboard/
│   │   ├── page.tsx                 # 업로드 + 기록 + 빈 상태/샘플
│   │   └── analyses/[id]/page.tsx   # 결과
│   ├── settings/page.tsx
│   ├── sample/page.tsx              # 공개 샘플 결과 (LLM 호출 없음)
│   ├── terms/ privacy/              # 이용약관·개인정보처리방침 (정적, 수탁사·국가 명시)
│   ├── auth/callback/route.ts       # OAuth code 교환
│   ├── auth/confirm/route.ts        # 이메일 인증·비밀번호 재설정 (token_hash)
│   ├── api/                         # 5.4 참고
│   ├── error.tsx  not-found.tsx
├── components/
│   ├── ui/ landing/ auth/
│   └── dashboard/{result,settings}/
├── lib/
│   ├── supabase/{server,browser,admin}.ts   # admin은 'server-only'
│   ├── auth.ts       # getUserId — getClaims()의 sub (server-only)
│   ├── auth-flow.ts  # 보호 경로·인증 리다이렉트·입력 검증 (순수 함수)
│   ├── mock.ts       # isMocked — MOCK_SERVICES env만 읽음
│   ├── data/         # server-only 조회·RPC 래퍼, 모든 사용자 쿼리에 claims.sub 소유권 조건
│   ├── sheet/        # readRows, normalize (순수 함수)
│   ├── analysis/     # summarize, detect, monthlyTrend (순수 함수)
│   ├── plan.ts       # resolvePlan, limits, toAnalysisView
│   ├── api-error.ts  # apiError(code, status)
│   ├── format.ts     # 원화 금액·날짜 문자열 표기 (순수 함수)
│   └── log.ts        # logError(event, meta) — 파일 내용 기록 금지
├── services/
│   ├── claude.ts
│   ├── claude-config.ts  # timeout·재시도·배치·max_tokens 상수
│   ├── claude-errors.ts  # ClaudeServiceError
│   ├── claude-mock.ts    # MOCK_SERVICES=claude일 때의 fixture mock
│   ├── polar.ts
│   ├── analysis-pipeline.ts
│   └── deletion.ts   # Storage·Polar·DB 삭제 순서와 재시도
├── messages/errors.ts               # 에러 코드 → 한국어 문구
├── sample/analysis.json             # 샘플 결과 (AnalysisView 형태)
├── types/
└── proxy.ts                         # Supabase 세션 갱신 + /dashboard·/settings 보호
supabase/migrations/
```

### 5.2 분석 흐름 (동기)
```
업로드 폼 → POST /api/analyses (multipart, maxDuration = 300)
  1. getClaims()로 인증, 파일 수·크기 검증
  2. 파일별 sha256 → 완료된 분석에 같은 해시가 있으면 409 duplicate_file
  3. startAnalysis: 6분 넘은 processing을 failed/timeout으로 정리 →
     원장에서 이번 달(UTC) 성공 수 확인(한도 이상이면 429 monthly_limit) →
     analyses(processing) insert. 부분 unique index 위반이면 409 analysis_in_progress (5.3.2)
  4. uploads에 경로를 먼저 기록한 뒤 Storage에 원본 저장 (서버 생성 경로)
  5. readRows: 엄격 디코딩 + 첫 시트 추출 + 시트 1,200행 상한 (5.2.1)
  6. Claude mapColumns(헤더 후보와 샘플) → ColumnMapping. 모델은 1단계에서 확인한 플랜으로 결정(Free Sonnet, Pro Opus). 원화 금액 열이 없으면 unsupported_currency
  7. normalize: 잘못된 행 20% 초과 시 실패
  8. 고유 가맹점만 Claude classifyMerchants (100개 배치, 동시 요청 최대 2개)
  9. summarize + detect (항상 계산). history는 본인·completed 조건으로 조회
 10. completeAnalysis RPC (한 트랜잭션): analyses를 WHERE id AND user_id AND status='processing'으로
     completed 전환 → 0건이면 중단(이미 timeout 처리됨) → transactions insert → 사용량 원장 row insert
실패 시: UPDATE analyses SET status='failed', error_code WHERE id AND user_id AND status='processing'
         원본·uploads는 실패 원인 확인과 사용자 삭제를 위해 유지, 거래 데이터는 남기지 않음
응답: 201 { analysisId } → 클라이언트가 결과 페이지로 이동
```

### 5.2.1 파일 읽기·행수·인코딩

- 읽기 상한은 **시트 1,200행 하나**다(제목·헤더·빈 행·합계 포함). `sheetRows: 1201`로 읽어 1,201번째 행이 있으면 `too_many_rows`로 거부한다. 잘린 결과로 분석하지 않는다. CSV의 인용부호 안 줄바꿈은 1행으로 센다. 첫 시트만 읽으며 업로드 안내에 명시한다.
- 컬럼 수·셀 길이는 1MB 파일 한도로 충분히 제한되므로 따로 검사하지 않는다.
- CSV와 HTML-xls는 BOM을 처리한 뒤 `new TextDecoder('utf-8', { fatal: true })`로 디코딩하고, 실패하면 `new TextDecoder('euc-kr', { fatal: true })`(CP949 확장 문자 포함)로 디코딩한다. 둘 다 실패하면 `unsupported_encoding`; 깨진 문자를 대체해 분석을 계속하지 않는다. 디코딩한 문자열을 SheetJS에 넘긴다(구분자는 SheetJS가 판별).
- 바이너리 xls/xlsx에는 텍스트 디코딩을 적용하지 않는다. 레거시 xls용 codepage 지원(`cpexcel`)을 로드한다. UTF-8 BOM·BOM 없는 UTF-8·CP949 확장 문자·CP949 HTML-xls를 fixture로 검증한다.
- 헤더 이후 비어 있지 않은 행에서 명확한 합계·소계·반복 헤더를 뺀 행 중 날짜·금액 오류가 20%를 넘으면 `too_many_invalid_rows`로 실패한다. `skippedRows`에는 제외한 잘못된 행과 0원 행을 센다. 날짜 파싱 실패만으로 합계행이라고 간주하지 않는다.

### 5.2.2 실행 시간·정체 복구

- 분석 라우트 `maxDuration = 300`. Claude SDK는 호출별 `timeout`과 `maxRetries: 1`을 설정한다. 값은 5단계(`claude-service`)에서 잠정값을 상수로 두고, 15단계(`go-live`)에서 Sonnet 5.5·Opus 5.5의 실제 응답 시간(가맹점 100개 분류 기준)을 재서 확정한다. 이때 Free 최대 입력(1파일·1,200행, Sonnet)과 Pro 최대 입력(3파일·3,600행, Opus)이 각각 240초 안에 끝나는지 확인한다. 넘으면 배치 크기·동시 요청 수를 조정한다.
- 대시보드·분석 상세·업로드·삭제의 서버 진입점은 `recoverStaleAnalyses(userId)`를 호출한다: `UPDATE analyses SET status='failed', error_code='timeout' WHERE user_id AND status='processing' AND created_at < now() - 6분`. 기준(6분)이 최대 실행 시간(5분)보다 길어 아직 실행 중인 요청을 실패로 바꾸지 않는다.
- 늦게 끝난 요청은 `completeAnalysis`의 `status='processing'` 조건에 걸려 아무것도 저장하지 못한다. 거래 insert·완료 전환·사용량 기록이 한 트랜잭션이라 강제 종료돼도 일부 거래만 남지 않는다. 읽기에는 `completed` 분석의 거래만 사용한다.
- 클라이언트 연결 종료를 분석 취소로 연결하지 않는다. 연결 종료 후에도 처리가 끝까지 도는지는 배포 환경에서 확인한다.

### 5.3 데이터베이스

| 테이블 | 컬럼 |
|---|---|
| `subscriptions` | `id`, `user_id`, `polar_subscription_id` unique, `polar_customer_id`, `status`, `cancel_at_period_end`, `current_period_end`, `updated_at` |
| `analyses` | `id`, `user_id`, `status`(processing/completed/failed), `error_code`, `failed_upload_id` nullable, `summary` jsonb, `detections` jsonb, `insights` jsonb, `created_at`, `completed_at` nullable |
| `uploads` | `id`, `analysis_id`, `user_id`, `original_filename`, `storage_path`, `file_hash`, `row_count`, `column_mapping` jsonb |
| `transactions` | `id`, `analysis_id`, `user_id`, `occurred_on` date, `amount` bigint (원 단위, 항상 양수), `direction`(debit/credit), `merchant`, `description`, `category`, `is_recurring`, `anomaly_type` |
| `analysis_usage` | `analysis_id` uuid PK (analyses에 FK 없음), `user_id`, `usage_month` date (분석 시작 시각의 UTC 월 첫날), `created_at` — **성공한 분석만** 기록 |

- 인덱스: `transactions(user_id, occurred_on)`, `uploads(user_id, file_hash)`, `analysis_usage(user_id, usage_month)`, **`analyses(user_id) WHERE status = 'processing'` 부분 unique 인덱스**로 사용자당 처리 중 분석 1건을 보장한다.
- 무결성: `uploads`·`transactions`는 `analyses(id)`를 참조한다. 쓰기는 서버(`lib/data`·완료 RPC)만 하므로 `user_id` 일치는 서버 코드가 보장한다. 파일별 오류의 upload ID는 같은 분석의 upload인지 확인한다.
- 삭제: `analyses` → `uploads`, `transactions` cascade. **`analysis_usage`는 분석 삭제에 cascade하지 않는다.** `auth.users` 삭제 시에는 원장을 포함한 전 사용자 테이블 cascade.
- Storage: private 버킷 `csv-uploads`, `file_size_limit` 1MB, 클라이언트 정책 없음(서버만 읽기/쓰기)
- 카테고리 enum: `food, cafe, groceries, transport, shopping, subscription, utilities, housing, health, education, entertainment, travel, transfer, income, other`

### 5.3.1 접근 권한

- 모든 테이블에 RLS를 켜고, 마이그레이션에서 `anon`·`authenticated`의 테이블 권한을 **전부 회수**한다(정책 없음). 클라이언트는 어떤 테이블에도 직접 접근하지 않는다. `completeAnalysis` RPC는 `PUBLIC`·`anon`·`authenticated`의 EXECUTE를 회수하고 `service_role`에만 허용한다.
- 모든 조회는 `server-only`인 `lib/data`에서 secret key로 한다. 이 클라이언트는 RLS를 우회하므로 **인증된 `claims.sub`와 row 소유권을 매번 검사**한다. ID 조회·삭제는 항상 `id = 요청 ID AND user_id = claims.sub`, 이력·파일 조회도 같은 사용자 조건을 사용한다. 알 수 없는 ID와 타인 ID는 동일한 404를 반환한다.
- 조회 순서: 소유권 → 플랜 확인 → 필요한 거래/추이 조회 → `toAnalysisView` 직렬화. 결과 페이지(Server Component)와 인사이트 API는 같은 `lib/data` 경로를 사용한다. DB row 전체를 Client Component props에 전달하지 않는다.
- 대시보드 기록 목록은 `id/status/createdAt/errorCode`와 본인 파일명·총지출(`summary.totalSpend`)·기간만 노출한다. 거래·탐지·추이·인사이트는 넣지 않는다.
- Free는 자신의 모든 분석을 열람하지만 일반 거래 필드와 탐지 건수만 받는다. `isRecurring`·`anomalyType`은 Pro 탐지 상세에만 포함하고, 저장되어 있던 인사이트·추이도 Free 응답에서 제거한다.

### 5.3.2 월 사용량

- 사용량은 **성공한 분석만** `analysis_usage`에 기록한다(완료 RPC 안에서). 실패·timeout은 기록하지 않으므로 해제 절차가 없다.
- 한도 검사는 `analysis_usage`에서 해당 사용자의 이번 달 row 수만 센다. 삭제 가능한 analyses와 join하지 않으므로 분석을 삭제해도 횟수가 돌아오지 않는다. 다운그레이드 후에도 유지한다.
- 사용자당 처리 중 분석이 1건뿐이라(부분 unique index) 동시 요청으로 한도를 넘을 수 없다. 한도 확인 직후 다른 요청이 끼어들어도 insert가 unique 위반으로 막힌다.
- 월 귀속은 분석 시작 시각 기준이다. 월 경계를 넘겨 완료해도 시작 월로 기록한다.

### 5.3.3 분석 삭제·회원 탈퇴

- 분석 삭제: 인증·소유권 확인 → 정체 분석 복구 → 처리 중이면 409 → 해당 분석의 Storage prefix 아래 모든 객체 삭제 → 삭제 완료 확인 → DB analyses 삭제(cascade). 원본이 이미 없으면 성공으로 취급한다. Storage 실패 시 DB와 경로를 유지하고 502 `storage_delete_failed`로 재시도할 수 있게 한다. 성공 사용량은 유지한다.
- 원본 저장 전에 uploads와 서버 생성 경로를 기록한다. 업로드 실패/강제 종료로 일부 객체만 있어도 `{user_id}/{analysis_id}/` prefix로 정리할 수 있다. 파일 목록은 페이지를 끝까지 순회하며 Storage의 '폴더' 이름만 삭제 요청하지 않는다.
- 회원 탈퇴 순서: ① Polar에서 `customerExternalId = claims.sub`로 현재 구독 조회(로컬 subscriptions 유무와 무관) → 청구 가능한 모든 구독 취소 확인, 실패 시 502 `subscription_cancel_failed`로 중단 → ② 사용자 Storage prefix 전체 삭제·확인, 실패 시 502 `storage_delete_failed` → ③ auth 사용자 삭제(DB cascade), 실패 시 502 `account_delete_failed`.
- 앞 단계가 실패하면 뒤 단계를 실행하지 않으므로 재시도에 필요한 계정·연결 정보가 남는다. 이미 취소된 구독·삭제된 객체는 재시도 시 성공으로 처리한다. 탈퇴 도중 처리 중이던 분석은 auth 삭제 cascade로 함께 정리된다.
- ③ 이후 사용자 Storage prefix를 한 번 더 지운다. ②와 ③ 사이에 진행 중이던 업로드가 남긴 원본을 정리하기 위해서다. 계정은 이미 삭제됐으므로 이 단계가 실패해도 탈퇴는 성공으로 두고 `logError`로 코드만 남긴다.

### 5.4 인터페이스

**타입 (`src/types/`)**
```ts
type Plan = 'free' | 'pro'
type AnalysisStatus = 'processing' | 'completed' | 'failed'
type AnalysisErrorCode = 'not_transactions' | 'mapping_failed' | 'too_many_invalid_rows'
  | 'file_unreadable' | 'file_encrypted' | 'llm_unavailable' | 'timeout'
  | 'too_many_rows' | 'unsupported_encoding' | 'unsupported_currency' | 'storage_upload_failed'
  | 'internal_error'            // DB 장애 등 파일과 무관한 실패 (uploadId 없음, API 500)
type ApiErrorCode = 'unauthorized' | 'not_found' | 'file_too_large' | 'too_many_files'
  | 'monthly_limit' | 'duplicate_file' | 'already_pro' | 'pro_required'
  | 'analysis_in_progress' | 'storage_delete_failed'
  | 'subscription_cancel_failed' | 'account_delete_failed' | 'internal_error'

interface ReadRowsResult {
  rows: string[][]              // 원래 행 위치 유지, headerRowIndex와 일치
  encoding: 'utf-8' | 'cp949' | null // null은 바이너리 Excel
}

interface ColumnMapping {
  isTransactions: boolean
  isKrw: boolean                // 원화 금액 열이 없으면 false → unsupported_currency
  headerRowIndex: number
  dateColumn: string
  dateFormat: string            // 예: 'YYYY.MM.DD', 'MM/DD'
  assumedYear?: number          // 날짜에 연도가 없을 때
  merchantColumn: string
  descriptionColumn?: string
  amount: { mode: 'single'; column: string; debitIsNegative: boolean } // 해외 결제는 원화 환산 열
        | { mode: 'split'; debitColumn: string; creditColumn: string }
}
interface Transaction {
  occurredOn: string            // 'YYYY-MM-DD' 문자열 유지
  amount: number                // 원 단위 정수
  direction: 'debit' | 'credit'
  merchant: string; description?: string; category: Category
  isRecurring: boolean; anomalyType: 'duplicate' | 'spike' | null
}
interface AnalysisSummary {
  totalSpend: number
  byCategory: Partial<Record<Category, number>>
  topMerchants: { merchant: string; amount: number }[]
  period: { from: string; to: string }
  transactionCount: number; skippedRows: number
}
type TransactionView = Omit<Transaction, 'isRecurring' | 'anomalyType'>
interface MonthlyTrend {
  points: { month: string; total: number }[] // YYYY-MM, 오름차순, 본인 완료 이력
  comparison: {
    month: string; previousMonth: string
    delta: number; percent: number | null   // 전월 합계가 0이면 percent는 null
  } | null                                // 직전 달 데이터가 없으면 비교 없음
}
interface AnalysisView {        // 서버가 클라이언트로 내보내는 유일한 형태
  id: string; status: AnalysisStatus; errorCode?: AnalysisErrorCode
  failedUpload?: { id: string; filename: string } // 본인의 실패 건에만, 경로·내용은 제외
  summary?: AnalysisSummary
  transactions?: TransactionView[] // completed 분석만, 최대 3,600건
  detections?: { recurringCount: number; anomalyCount: number; items?: Transaction[] } // items는 Pro만
  trend?: MonthlyTrend         // Pro만
  insights?: Insight[] | null   // Pro만
}
```

- `processing`·`failed` 응답에는 메타데이터와 해당 오류만 포함한다. 단순 UI 숨김 대신 허용 필드만 선택해 응답 객체를 새로 만든다.
- Free의 completed 응답은 `summary/transactions/detections` 건수, Pro는 여기에 탐지 상세·`trend/insights`를 더한다. 샘플 데이터도 동일 계약을 따른다.
- 추이는 본인의 완료 거래를 매번 집계한다. 가장 최근 거래 월과 그 직전 달을 비교하며, 빠진 달을 0원으로 만들거나 직전 관측 월로 대체하지 않는다. 월이 1개뿐이면 비교 없이 안내를 표시한다.

**서비스 (`src/services/`)**
```ts
// claude.ts — structured outputs + zod parse. 모델은 plan으로 선택: free → CLAUDE_MODEL_FREE, pro → CLAUDE_MODEL_PRO
mapColumns(header: string[], sampleRows: string[][], plan: Plan): Promise<ColumnMapping>
classifyMerchants(merchants: string[], plan: Plan): Promise<Record<string, Category>> // 100개 배치, 누락분은 'other'
generateInsights(input: { summary; detections; trend? }): Promise<Insight[]> // Pro 전용이라 항상 Pro 모델, 한국어
// polar.ts
createCheckout(userId: string, email: string): Promise<string>   // checkout URL
cancelSubscriptions(userId: string): Promise<void> // Polar에서 현재 구독을 조회하고 추가 청구 중단 확인
getSubscription(id: string): Promise<{ customerId; status; cancelAtPeriodEnd; currentPeriodEnd }> // 웹훅이 payload 대신 저장할 현재 상태
// analysis-pipeline.ts
runAnalysis(userId: string, analysisId: string, plan: Plan, files: { uploadId: string; bytes: ArrayBuffer }[]): Promise<void>
// lib/data — server-only RPC 래퍼, userId는 검증된 claims.sub만 전달
startAnalysis(userId: string, plan: Plan): Promise<{ analysisId: string }> // monthly_limit·analysis_in_progress
completeAnalysis(userId: string, analysisId: string, result: { transactions; summary; detections }): Promise<boolean> // RPC, false면 이미 timeout
failAnalysis(userId: string, analysisId: string, error: { code: AnalysisErrorCode; uploadId?: string }): Promise<void> // status='processing'일 때만
recoverStaleAnalyses(userId: string): Promise<void>
getAnalysisView(userId: string, analysisId: string): Promise<AnalysisView | null> // 결과 페이지용, null이면 404
```

**순수 함수 (`src/lib/`)**
```ts
readRows(bytes: ArrayBuffer): ReadRowsResult
normalize(rows: string[][], m: ColumnMapping): { txs: RawTx[]; skipped: number }
summarize(txs: Transaction[]): AnalysisSummary
detect(txs: Transaction[], history: Transaction[]): Transaction[]
monthlyTrend(history: Transaction[]): MonthlyTrend
resolvePlan(sub: SubscriptionRow | null): Plan            // active | trialing | past_due → pro
limits(plan: Plan): { maxFiles; maxBytesPerFile; maxSheetRows; monthlyAnalyses }
toAnalysisView(input: { row: AnalysisRow; transactions: Transaction[]; trend: MonthlyTrend | null }, plan: Plan): AnalysisView
```

**API**

| 메서드 · 경로 | 요청 | 성공 | 실패 |
|---|---|---|---|
| `POST /api/analyses` | multipart 파일 1~3개 | `201 { analysisId }` | 400 크기·개수 검증, 409 `duplicate_file`(완료 분석 또는 같은 요청 안의 같은 해시)/`analysis_in_progress`, 429 `monthly_limit`, 422 파싱·통화·분석 실패, 500 `internal_error`, 504 `timeout` |
| `DELETE /api/analyses/[id]` | – | `204` | 404, 409 `analysis_in_progress`, 502 `storage_delete_failed` |
| `POST /api/analyses/[id]/insights` | – | `200 { insights }` | 403 `pro_required`, 404, 504 `timeout` |
| `GET /api/checkout` | – | 302 Polar | 401, 409 `already_pro` |
| `GET /api/portal` | – | 302 Polar | 401, 404 |
| `POST /api/webhooks/polar` | Polar 서명 | 200 | 403 서명 불일치, 500 DB 실패(재시도 유도) |
| `DELETE /api/account` | – | 204 | 401, 502 `subscription_cancel_failed`/`storage_delete_failed`/`account_delete_failed` |

- 분석 결과 조회는 API 없이 결과 페이지(Server Component)가 `getAnalysisView`를 호출한다.
- 모든 사용자 API는 인증 실패 시 401. 앱이 만드는 실패 응답은 `{ error: { code, analysisId?, uploadId? } }`로 통일한다. 분석 생성 후 실패에는 `analysisId`, 파일별 실패에는 본인 `uploadId`를 포함하고 파일명은 본인 업로드 목록에서 표시한다. 문구는 `messages/errors.ts`.
- 플랫폼 강제 종료로 앱의 오류 응답을 만들지 못하면 일반 재시도 안내 후 대시보드에서 상태를 확인한다. 다음 서버 접근에서 정체 분석을 복구한다.
- 인사이트는 본인 completed 분석에만 생성하며, 기존 값이 있으면 그대로 반환한다. 신규 생성에도 5.2.2의 SDK 호출 제한을 적용하고, 인사이트 실패가 이미 성공한 분석의 상태·사용량을 바꾸지 않게 한다.

### 5.5 에러 처리
1. 에러 코드는 `src/types/errors.ts` 한 곳에서 정의, 문구는 `src/messages/errors.ts`
2. API는 `apiError(code, status)`만 사용
3. 파이프라인 예외는 `AnalysisErrorCode`로 변환해 저장, 예외 원문은 저장·로그 금지
4. Claude SDK 호출별 timeout·`maxRetries: 1` (값은 실측으로 결정, 5.2.2). 늦은 완료는 `status='processing'` 조건으로 차단
5. 로그는 `logError(event, { code, analysisId, durationMs })`만
6. 웹훅은 DB 반영 후 200, DB 실패는 500, 알 수 없는 사용자는 200
7. 저장·정리 실패도 정해진 코드로 변환한다. DB 연결 장애로 상태 기록이 불가능하면 다음 서버 진입 시 정체 복구하며, 원본/구독 정보를 먼저 삭제하지 않는다

---

## 6. 파일·데이터 엣지 케이스

| # | 케이스 | 처리 |
|---|---|---|
| E1 | 암호 걸린 엑셀 (국내 카드사 다수) | `file_encrypted` + 암호 해제 방법 안내 |
| E2 | 확장자 .xls지만 실제로는 HTML 표 (국내 은행 다수) | SheetJS가 자동 판별 |
| E3 | EUC-KR/CP949, UTF-8 BOM, 구분자 `;` `\t`, 잘못된 바이트 | 엄격한 UTF-8 → CP949 디코딩 후 SheetJS가 구분자 판별. 둘 다 실패하면 `unsupported_encoding` (5.2.1) |
| E4 | 헤더 위에 제목·기간 행 | 매핑의 `headerRowIndex` |
| E5 | 하단 합계·소계 행 | 명확한 구조행 규칙으로 식별된 행만 제외. 나머지 날짜 실패는 잘못된 행으로 집계 |
| E6 | 금액 `12,000원`, `₩12,000`, `(12,000)` | normalize에서 숫자 추출 |
| E7 | 입금/출금 컬럼 분리 (은행) | 매핑 `amount.mode = 'split'` |
| E8 | 취소·환불 | `credit`로 저장, 지출 합계에서 차감 |
| E9 | 할부 | 이번 달 청구액 컬럼 매핑 |
| E10 | 해외 결제·외화 파일 | 원화 환산 금액 열을 선택. 원화 금액 열이 없는 파일(외화 전용 명세서)은 `unsupported_currency` |
| E11 | 연도 없는 날짜 `09/01` | `assumedYear`, 12월→1월 넘어가면 연도 +1 |
| E12 | 월 집계 시간대 밀림 | 날짜는 문자열로 저장·집계, `Date` 변환 금지 |
| E13 | 빈 파일 / 헤더만 / 거래내역 아님 | `file_unreadable` / `not_transactions` |
| E14 | 잘못된 행 20% 초과 | `too_many_invalid_rows` (틀린 결과를 보여주지 않음) |
| E15 | 0원 행 | 제외 |
| E16 | 같은 날 같은 가맹점·같은 금액 2건 | 둘 다 저장, `duplicate` 이상거래로 표시 |
| E17 | 시트 1,201행 이상 | `too_many_rows`. 잘린 앞부분을 성공 결과로 저장하지 않음 |

---

## 7. 보안

| 항목 | 방법 |
|---|---|
| 데이터 격리 | 전 테이블 RLS + 클라이언트 권한 전부 회수. 모든 조회·변경은 서버에서 claims.sub 소유권 조건 (5.3.1) |
| 유료 권한 | 결과 페이지 props·인사이트 응답에 플랜별 허용 필드만 직렬화. Free에 탐지 플래그·추이·인사이트를 전달하지 않음 |
| 삭제 권한 | 클라이언트 DELETE 전면 금지. Storage·Polar 처리 성공 확인 후 DB/auth 삭제 (5.3.3) |
| 키 관리 | `SUPABASE_SECRET_KEY`, `ANTHROPIC_API_KEY`, `POLAR_*`는 서버 전용, admin 클라이언트에 `import 'server-only'` |
| 서비스 키 사용 시 | 사용자 요청에서는 `user_id = claims.sub`와 대상 row 소유권을 함께 검사. 웹훅은 검증된 Polar external ID를 사용자에 매핑. 요청값이나 소유권 미검증 DB row만으로 권한 판단 금지 |
| 인증 확인 | `getClaims()` 사용 (`getSession()`으로 권한 판단 금지) |
| 구독 변경 | 실제 결제 모드는 서명 검증된 웹훅으로만 (`@polar-sh/nextjs` `Webhooks`). 이벤트 순서 역전·재시도로 오래된 상태를 덮어쓰지 않도록 payload 대신 Polar에서 현재 구독 상태를 다시 조회해 저장한다. 명시적 Polar mock 모드의 예외는 11.2에 한정 |
| 파일 업로드 | 서버가 크기·개수·행수 검증, 저장 경로는 서버가 생성, 원본 파일명은 텍스트로만 표시 |
| 파서 자원 고갈 | 1MB 입력 + 시트 1,200행(`sheetRows: 1201`) (5.2.1). 요청 단위 실패라 압축 해제 사전 검사는 생략 |
| XSS | 가맹점명·인사이트는 React 텍스트로만 렌더, `dangerouslySetInnerHTML`·마크다운 렌더 금지 |
| 프롬프트 인젝션 | 분류는 enum만, 인사이트는 JSON schema(문장 배열) + 텍스트 렌더 |
| 보안 헤더 | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` |
| CSRF | Supabase 쿠키 SameSite=Lax |
| 계정 열거 | Supabase 기본 동작 유지 (가입 응답 동일) |
| 로그 | 파일 내용·가맹점명 금지, `logError()`만 |
| 비용 남용 | 이메일 인증 + 삭제와 독립적인 성공 사용량 원장 + 사용자당 처리 중 1건 + SDK 호출 제한 + Anthropic 콘솔 월 사용 한도 |
| 개인정보 | Anthropic·Polar·Vercel로 국외 이전 → 가입 시 동의 체크 + 처리방침에 수탁사·국가 명시 |

---

## 10. 운영 · 비용
- 월 고정비: 개발 중 $0 → 결제를 켜는 시점 Vercel Pro $20 (Hobby는 상업적 이용 금지) → Supabase Pro $25는 필요할 때
- Anthropic 콘솔에 월 사용 한도 설정
- 환경 변수: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `ANTHROPIC_API_KEY`, `CLAUDE_MODEL_FREE`, `CLAUDE_MODEL_PRO`, `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_PRO_PRODUCT_ID`, `POLAR_SERVER`, `NEXT_PUBLIC_APP_URL`, `MOCK_SERVICES` (예: `claude,polar`, 실제 전환 시 삭제)
- Supabase 프로젝트는 2개: **개발용**(6~14단계 배포·통합 테스트, 로컬 `.env.local`), **운영용**(15단계에서 생성). 통합 테스트는 운영 프로젝트에 절대 연결하지 않는다
- 사전 준비 (사용자):
  - 구현 시작 전: `! npx vercel login`
  - 6단계 전: Supabase 개발 프로젝트 생성 + `! npx supabase login`, 키 3개와 `SUPABASE_DB_PASSWORD`를 `.env.local`에 기록
  - 7단계 전: Google OAuth 클라이언트, Supabase 커스텀 SMTP 연결(템플릿 수정에 필수, 예: Gmail 앱 비밀번호), 이메일 템플릿을 `token_hash` 방식으로 수정
  - 15단계 전: Supabase 운영 프로젝트, Anthropic API 키, Polar 샌드박스 + Pro 상품, Polar 웹훅 엔드포인트(`{prodUrl}/api/webhooks/polar`) 등록. 운영 값은 `.env.go-live.local`에만 기록한다(`.env.local`은 개발 프로젝트 전용, 통합 테스트가 읽음)

---

## 11. 실행 계획

### 11.1 구현 step (`phases/0-mvp`)

| # | step | 내용 | 관련 시나리오 |
|---|---|---|---|
| 0 | `project-setup` | Next.js 16, Tailwind, Vitest, ESLint, 보안 헤더, `vercel link`, `MOCK_SERVICES` env, `deploy.config.json`에 운영 도메인 기록, `deploy`·`smoke` 스크립트, **첫 배포** | – |
| 1 | `core-types` | 도메인·ReadRowsResult·AnalysisView 타입, 에러 코드·`messages/errors.ts`, `lib/plan.ts`, `api-error`·`log`, 직렬화 권한 테스트 | 3.4, 6.1, R4, R8 |
| 2 | `sheet-parsing` | readRows·normalize + 엄격 디코딩·시트 1,200행 상한, 경계 fixture | E1~E17, R3, R6, R7 |
| 3 | `analysis-logic` | summarize·detect·monthlyTrend, 전월 비교 | 3.1, 3.2, E16 |
| 4 | `ui-kit` | 디자인 토큰·폰트(`globals.css`), `components/ui/` 공용 컴포넌트, PublicHeader·AppHeader, 데모 모드 띠, `error.tsx`·`not-found.tsx`, `lib/format.ts` | – |
| 5 | `claude-service` | 실제 + fixture mock 매핑(원화 열 판정 포함)·분류·인사이트, timeout·배치 크기 **잠정값** 상수화, 응답 시간 실측 스크립트 | E4, E7, E10, E11, R5, R7 |
| 6 | `db-schema` | 마이그레이션(RLS·grants 회수·부분 unique index·완료 RPC·Storage), `supabase db push`(개발 프로젝트), `vercel env add`로 Supabase 키 3개, `lib/supabase`, `lib/data` 소유권 래퍼, 통합 테스트(권한 차단·완료 RPC) | 7절, R1, R2, R4, R5 |
| 7 | `auth-flow` | `proxy.ts`, 로그인·가입·재설정 화면, `/auth/callback`, `/auth/confirm` | J1 |
| 8 | `analysis-create` | `analysis-pipeline`, `POST /api/analyses`, 시작·정체 복구·완료·실패 처리 | J2, 2.1~2.5, 5.1, 5.2, R2, R3, R5 |
| 9 | `analysis-read-delete` | `getAnalysisView`(결과 조회), `DELETE /api/analyses/[id]`, 인사이트 라우트, `services/deletion.ts`(분석 삭제) | 3.4, 5.3, R1, R4, R8 |
| 10 | `dashboard-upload` | 대시보드: 사용량 미터, 빈 상태, 분석 목록, Free 잠금 카드, 업로드 폼, 분석 중 화면 | J2, 2.3, 2.4, 5.1, 5.2 |
| 11 | `result-view` | 결과 페이지(KPI·카테고리·가맹점·거래 목록·추이·전월 대비·Pro 잠금 카드·티저·인사이트), `sample/analysis.json`, 공개 `/sample` | J3, 3.3, 3.4, R8 |
| 12 | `billing` | `services/polar.ts` 실제 + mock(체크아웃 시 바로 구독 활성화), checkout·portal·webhook, 결제 확인 새로고침 | J4, J6 |
| 13 | `settings` | 구독 상태, 분석 삭제, 회원 탈퇴(Polar → Storage → auth 순서, 재시도) | J7, R1 |
| 14 | `landing` | 랜딩 + 요금제, 이용약관·개인정보처리방침 정적 페이지 | J1 |
| 15 | `go-live` | 운영 Supabase 생성·`db push`, 실제 키 등록(`vercel env add`), `MOCK_SERVICES` 삭제, Polar 웹훅 secret 등록, **Claude 응답 시간 실측 → timeout·배치 크기 확정**, 연결 종료 후 처리 확인, 최종 배포, 계정 2개·Free/Pro 수동 체크리스트 | 7절, R1~R8 |

0~5단계는 외부 계정 없이 진행 가능. 6~14단계는 Supabase 개발 프로젝트가 필요하고 Claude·Polar는 mock으로 진행·배포한다. 15단계는 모든 실제 키가 필요하다. 준비가 안 됐으면 `blocked`.

### 11.2 배포 전략 (Vercel CLI)

**step 0에서 설정:**
- `npx vercel link --yes` → `.vercel/` 생성 (`.gitignore`에 추가)
- `npx vercel env add MOCK_SERVICES production` (`claude,polar`), `NEXT_PUBLIC_APP_URL`
- 첫 배포 후 운영 도메인(예: `https://finsight-xxx.vercel.app`)을 `deploy.config.json`의 `prodUrl`에 기록해 커밋. 배포마다 바뀌는 고유 URL은 Vercel 배포 보호로 401이 날 수 있으므로 쓰지 않는다
- 스크립트: `deploy` = `vercel deploy --prod --yes`, `smoke` = `deploy.config.json`의 `prodUrl`로 요청해 200 확인하는 짧은 Node 스크립트

**매 step 자동 배포:** 모든 step의 AC 마지막에 아래를 넣는다. 배포 실패도 step 실패로 처리해 execute.py의 자가 교정(최대 3회)을 그대로 탄다.
```bash
npm run lint && npm run build && npm run test
npm run deploy     # 프로덕션 URL 갱신
npm run smoke      # prodUrl 200 확인
```
6단계부터는 `npm run test:integration`(개발 Supabase 대상)도 AC에 포함한다. 출시 전이라 사용자가 없으므로 프리뷰 대신 프로덕션 URL 하나를 계속 갱신한다.

**mock 모드 (`MOCK_SERVICES`):**
- `services/claude.ts`, `services/polar.ts`가 env를 보고 실제/mock 구현을 고른다. 자동 감지(키가 없으면 mock)는 하지 않는다 — 운영에서 키 누락 시 가짜 결과가 조용히 나가는 것을 막기 위해 명시적 env만 인정
- Claude mock: fixture 기반 고정 매핑·키워드 분류·고정 인사이트 → 업로드부터 결과까지 전체 흐름 확인 가능
- Polar mock: `/api/checkout`이 Polar 대신 해당 사용자 구독을 `active`로 기록하고 대시보드로 이동. `/api/portal`은 설정 페이지로 이동. 구독 조회·취소도 같은 서비스 계약을 구현해 탈퇴 흐름을 검증
- mock도 서버에서 인증·소유권을 확인하고, 금융 데이터 직접 접근 제한·사용량 원장·삭제 순서는 실제 모드와 동일하게 적용
- mock이 켜져 있으면 전 화면 상단에 "데모 모드" 띠 표시
- Supabase는 mock하지 않는다 (인증·권한을 mock하면 실제 동작을 검증할 수 없음)

**배포 시점별로 볼 수 있는 것:**

| step 완료 후 | 배포된 URL에서 확인 가능한 것 |
|---|---|
| 0 | 빈 랜딩 (배포 파이프라인 확인) |
| 7 | 가입·로그인·비밀번호 재설정 (개발 Supabase) |
| 11 | 업로드 → mock 분석 → 결과·차트·잠금 카드·샘플 |
| 12 | mock 결제로 Pro 전환 → Pro 기능 |
| 14 | 랜딩 포함 전체 흐름 (mock) |
| 15 | 운영 Supabase + 실제 Claude·Polar 샌드박스 |

## 12. 검증
- 각 step의 AC: `npm run lint && npm run build && npm run test && npm run deploy && npm run smoke` (6단계부터 `npm run test:integration` 추가)
- 모든 시나리오 번호(J1~J7, E1~E17, R1~R8)가 11.1 표의 담당 step에 연결됐는지 확인
- 배포 후 수동 확인: 이메일 가입(다른 기기에서 인증 링크) → 샘플 보기 → 국내 카드사 엑셀 업로드 → 결과 → Polar 샌드박스 결제 → Pro 기능 해제 → 포털에서 해지 → 회원 탈퇴
- 사용자 A의 분석 ID로 B가 결과 페이지·DELETE/인사이트 API에 접근 시 404. Free·Pro 모두 모든 테이블 직접 SELECT/INSERT/UPDATE/DELETE 및 완료 RPC 실행이 거부되는지 확인
- 자동 통합 테스트(개발 Supabase)는 **권한 차단**(anon·authenticated 토큰으로 모든 테이블 SELECT/INSERT/UPDATE/DELETE, 완료 RPC 실행 거부)과 **완료 RPC**(원자성, `processing` 아닐 때 0건, 사용량 1건 기록, 부분 unique index 위반)만 다룬다. 나머지는 단위 테스트와 15단계 수동 체크리스트로 확인한다. 단위 테스트에서는 Claude·Polar를 mock한다

### 12.1 리뷰 위험별 필수 검증

| ID | 위험 | 통과 기준 | 검증 방법 |
|---|---|---|---|
| R1 | 삭제 절차 우회·원본/구독 잔존 | 클라이언트 DELETE 거부. Storage 실패 시 DB 경로 보존 후 재시도 성공. 로컬 구독 row가 없어도 Polar 조회 수행. 구독 취소·Storage 정리 실패 시 auth 계정 보존 | 통합(권한) + 단위(deletion 서비스, 의존성 mock) |
| R2 | 삭제·동시 요청으로 사용량 우회 | Free 성공 5건을 삭제해도 다음 분석 429. 처리 중 분석이 있으면 두 번째 시작은 409. 실패·timeout은 미차감. 월 경계는 시작 월 유지 | 통합(부분 unique index, 원장) + 단위(한도 계산) |
| R3 | 행 잘림·합계 누락 | 각 지원 형식에서 시트 1,200행 성공·1,201행 거부. 제목/빈 행/합계가 섞인 파일의 거래 총합 일치. 인용된 줄바꿈은 1행 | 단위(fixture) |
| R4 | 유료 데이터 직접 조회·직렬화 누출 | Free·Pro 토큰으로 테이블 직접 SELECT·완료 RPC 실행 거부. Free의 결과 페이지 props에 탐지 items/플래그, trend, 기존 insights가 없음 | 통합(권한) + 단위(`toAnalysisView`) |
| R5 | 강제 종료·늦은 완료·부분 저장 | 6분 넘은 processing은 다음 접근에서 failed/timeout. 그 이후 도착한 완료는 0건 처리. 완료 저장 중 오류 시 거래·상태·사용량 전체 rollback | 통합(완료 RPC) + 단위(복구 호출) |
| R6 | 한국어 인코딩 손상 | UTF-8 BOM/무BOM·EUC-KR·CP949 확장 문자·CP949 HTML-xls에서 헤더·가맹점명이 기대값과 일치. 바이너리 xls codepage 확인. 잘못된 바이트는 `unsupported_encoding` | 단위(fixture) |
| R7 | 원화 판정 오류 | 통화 컬럼 없는 국내 카드 명세서 성공. 해외 결제가 섞인 명세서는 원화 환산 열로 합산. 원화 금액 열이 없는 외화 명세서는 `unsupported_currency` | 단위(fixture, 매핑 mock) |
| R8 | 화면 데이터 계약 누락 | Free 일반 거래 목록, Pro 거래 목록·추이·전월 대비 렌더링. processing/failed DTO의 허용 필드. 샘플과 결과 페이지가 같은 계약 | 단위(컴포넌트·직렬화) |

### 12.2 구현 시 참고할 공식 문서

- 접근 권한과 RLS의 구분: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- 읽기 행 제한·인코딩 옵션: [SheetJS 파싱 옵션](https://docs.sheetjs.com/docs/api/parse-options/), [Node.js 설치와 codepage 지원](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/)
- 호출 타임아웃·재시도 설정: [Anthropic TypeScript SDK](https://platform.claude.com/docs/en/cli-sdks-libraries/sdks/typescript#timeouts), [Vercel 실행 시간 제한](https://vercel.com/docs/functions/configuring-functions/duration)
