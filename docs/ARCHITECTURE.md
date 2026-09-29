# 아키텍처

> 원본: `plan.md` 5~7절, 10절. 절 번호와 본문의 참조 번호(예: 5.2.1, 11.3)는 `plan.md` 기준이다. 스택·결정의 이유는 `docs/ADR.md`.

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
│   ├── auth/callback/route.ts       # OAuth code 교환
│   ├── auth/confirm/route.ts        # 이메일 인증·비밀번호 재설정 (token_hash)
│   ├── api/                         # 5.4 참고
│   ├── error.tsx  not-found.tsx
├── components/{ui,landing,dashboard}/
├── lib/
│   ├── supabase/{server,browser,admin}.ts   # admin은 'server-only'
│   ├── data/         # server-only 조회·RPC 래퍼, 모든 사용자 쿼리에 claims.sub 소유권 조건
│   ├── sheet/        # readRows, normalize (순수 함수)
│   ├── analysis/     # summarize, detect, monthlyTrend (순수 함수)
│   ├── plan.ts       # resolvePlan, limits, canViewAnalysis, toAnalysisView
│   ├── api-error.ts  # apiError(code, status)
│   └── log.ts        # logError(event, meta) — 파일 내용 기록 금지
├── services/
│   ├── claude.ts
│   ├── polar.ts
│   ├── analysis-pipeline.ts
│   └── deletion.ts   # Storage·Polar·DB 삭제 순서와 재시도
├── messages/{ko,en}.json
├── sample/analysis.{ko,en}.json     # 샘플 결과 (AnalysisView 형태)
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
  5. readRows: 엄격 디코딩 + 첫 시트 추출 + 행·컬럼·셀 상한 검증 (5.2.1)
  6. Claude mapColumns(헤더 후보와 샘플) → ColumnMapping
  7. normalize에서 먼저 후보 거래행 1,000행 상한 검사. 잘못된 행 20% 초과 시 실패
     통화를 판정(E10)하고, 행·파일 간 통화 불일치 시 mixed_currency
  8. 고유 가맹점만 Claude classifyMerchants (100개 배치, 동시 요청 최대 2개)
  9. summarize + detect (항상 계산). history는 본인·completed·현재 통화 조건으로 조회
 10. completeAnalysis RPC (한 트랜잭션): analyses를 WHERE id AND user_id AND status='processing'으로
     completed 전환 → 0건이면 중단(이미 timeout 처리됨) → transactions insert → 사용량 원장 row insert
실패 시: UPDATE analyses SET status='failed', error_code WHERE id AND user_id AND status='processing'
         원본·uploads는 실패 원인 확인과 사용자 삭제를 위해 유지, 거래 데이터는 남기지 않음
응답: 201 { analysisId } → 클라이언트가 결과 페이지로 이동
```

### 5.2.1 파일 읽기·행수·인코딩

- **거래 한도와 읽기 상한을 분리한다.** 헤더 이후 비어 있지 않은 행에서 명확히 식별된 반복 헤더·합계·소계만 제외한 것을 '후보 거래행'으로 정의한다. 잘못된 날짜·금액과 0원 행도 한도 계산에는 포함한다. 후보가 1,000행을 넘으면 정규화로 버리기 전에 `too_many_rows`로 거부한다.
- 시트는 제목·헤더·빈 행·합계까지 포함해 최대 1,200행을 지원한다. `sheetRows: 1201`로 읽어 **1,201번째 행이 있으면 `too_many_sheet_rows`로 거부**한다. 잘린 결과로 분석하지 않는다. CSV의 인용부호 안 줄바꿈은 1행으로 센다. 첫 시트 외 거래 시트 선택은 MVP에서 지원하지 않고 업로드 안내에 명시한다.
- 컬럼 50개·셀 500자 상한을 넘으면 `file_structure_limit`로 거부한다.
- CSV와 HTML-xls는 BOM을 처리한 뒤 `new TextDecoder('utf-8', { fatal: true })`로 디코딩하고, 실패하면 `new TextDecoder('euc-kr', { fatal: true })`(CP949 확장 문자 포함)로 디코딩한다. 둘 다 실패하면 `unsupported_encoding`; 깨진 문자를 대체해 분석을 계속하지 않는다. 디코딩한 문자열을 SheetJS에 넘긴다(구분자는 SheetJS가 판별).
- 바이너리 xls/xlsx에는 텍스트 디코딩을 적용하지 않는다. 레거시 xls용 codepage 지원(`cpexcel`)을 로드한다. UTF-8 BOM·BOM 없는 UTF-8·CP949 확장 문자·CP949 HTML-xls를 fixture로 검증한다.
- 구조행을 제외한 후보 중 날짜·금액 오류 비율이 20%를 넘으면 실패한다. `skippedRows`에는 제외한 잘못된 후보 및 0원 행을 센다. 날짜 파싱 실패만으로 합계행이라고 간주하지 않는다.

### 5.2.2 실행 시간·정체 복구

- 분석 라우트 `maxDuration = 300`. Claude SDK는 호출별 `timeout`과 `maxRetries: 1`을 설정한다. 값은 6단계에서 Opus 5.5의 실제 응답 시간(가맹점 100개 분류 기준)을 재서 정하고, Pro 최대 입력(3파일·3,000행)이 240초 안에 끝나는지 확인한다. 넘으면 배치 크기·동시 요청 수를 조정한다.
- 대시보드·분석 상세·업로드·삭제의 서버 진입점은 `recoverStaleAnalyses(userId)`를 호출한다: `UPDATE analyses SET status='failed', error_code='timeout' WHERE user_id AND status='processing' AND created_at < now() - 6분`. 기준(6분)이 최대 실행 시간(5분)보다 길어 아직 실행 중인 요청을 실패로 바꾸지 않는다.
- 늦게 끝난 요청은 `completeAnalysis`의 `status='processing'` 조건에 걸려 아무것도 저장하지 못한다. 거래 insert·완료 전환·사용량 기록이 한 트랜잭션이라 강제 종료돼도 일부 거래만 남지 않는다. 읽기에는 `completed` 분석의 거래만 사용한다.
- 클라이언트 연결 종료를 분석 취소로 연결하지 않는다. 연결 종료 후에도 처리가 끝까지 도는지는 배포 환경에서 확인한다.

### 5.3 데이터베이스

| 테이블 | 컬럼 |
|---|---|
| `profiles` | `id`(= auth.users.id), `locale`, `created_at` — `handle_new_user` 트리거로 생성 |
| `subscriptions` | `id`, `user_id`, `polar_subscription_id` unique, `polar_customer_id`, `status`, `cancel_at_period_end`, `current_period_end`, `updated_at` |
| `analyses` | `id`, `user_id`, `status`(processing/completed/failed), `error_code`, `failed_upload_id` nullable, `currency` (processing 중 nullable), `summary` jsonb, `detections` jsonb, `insights` jsonb, `insights_locale`, `created_at`, `completed_at` nullable |
| `uploads` | `id`, `analysis_id`, `user_id`, `original_filename`, `storage_path`, `file_hash`, `row_count`, `column_mapping` jsonb |
| `transactions` | `id`, `analysis_id`, `user_id`, `occurred_on` date, `amount` numeric(14,2) (항상 양수), `currency`, `direction`(debit/credit), `merchant`, `description`, `category`, `is_recurring`, `anomaly_type` |
| `analysis_usage` | `analysis_id` uuid PK (analyses에 FK 없음), `user_id`, `usage_month` date (분석 시작 시각의 UTC 월 첫날), `created_at` — **성공한 분석만** 기록 |

- 인덱스: `transactions(user_id, currency, occurred_on)`, `uploads(user_id, file_hash)`, `analysis_usage(user_id, usage_month)`, **`analyses(user_id) WHERE status = 'processing'` 부분 unique 인덱스**로 사용자당 처리 중 분석 1건을 보장한다.
- 무결성: analyses에 `(id, user_id)`·`(id, user_id, currency)` unique 제약을 두고, uploads와 transactions가 각각 해당 조합을 참조하게 한다. 완료 분석의 currency는 필수이며 허용된 ISO 4217 코드 목록으로 검증한다. 파일별 오류의 upload ID도 동일 분석·사용자 소유인지 확인한다.
- 삭제: `analyses` → `uploads`, `transactions` cascade. **`analysis_usage`는 분석 삭제에 cascade하지 않는다.** `auth.users` 삭제 시에는 원장을 포함한 전 사용자 테이블 cascade.
- Storage: private 버킷 `csv-uploads`, `file_size_limit` 1MB, 클라이언트 정책 없음(서버만 읽기/쓰기)
- 카테고리 enum: `food, cafe, groceries, transport, shopping, subscription, utilities, housing, health, education, entertainment, travel, transfer, income, other`

### 5.3.1 접근 권한

- 모든 테이블에 RLS를 켜고, 마이그레이션에서 `anon`·`authenticated`의 기존 테이블 권한을 먼저 회수한다. `profiles`·`subscriptions`만 `authenticated`에 SELECT를 다시 허용하고 본인 row RLS를 적용한다. **모든 테이블의 클라이언트 INSERT/UPDATE/DELETE는 금지**한다.
- `analyses`·`uploads`·`transactions`·`analysis_usage`는 클라이언트 SELECT도 금지한다. 이들을 노출하는 view·RPC에 우회 권한을 주지 않는다. `completeAnalysis` RPC는 `PUBLIC`·`anon`·`authenticated`의 EXECUTE를 회수하고 `service_role`에만 허용한다.
- 금융 데이터는 `server-only`인 `lib/data`에서 secret key로 조회한다. 이 클라이언트는 RLS를 우회하므로 **인증된 `claims.sub`와 row 소유권을 매번 검사**한다. ID 조회·삭제는 항상 `id = 요청 ID AND user_id = claims.sub`, 이력·파일 조회도 같은 사용자 조건을 사용한다. 알 수 없는 ID와 타인 ID는 동일한 404를 반환한다.
- 조회 순서: 소유권 → 플랜과 최신 완료 분석 확인 → 열람 권한 → 필요한 거래/추이 조회 → `toAnalysisView` 직렬화. Server Component와 GET API는 같은 경로를 사용한다. DB row 전체를 Client Component props에 전달하지 않는다.
- 최신 완료 분석은 `completed_at DESC, id DESC`로 결정한다. 잠긴 분석의 응답은 식별자·상태·잠금 여부만 제공한다. 대시보드 기록 목록도 `id/status/createdAt/locked`만 노출하며 요약·가맹점·탐지 정보를 목록으로 우회 제공하지 않는다.
- Free는 일반 거래 필드와 탐지 건수만 받는다. `isRecurring`·`anomalyType`은 Pro 탐지 상세에만 포함하고, 저장되어 있던 인사이트도 Free 응답에서 제거한다.

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

### 5.4 인터페이스

**타입 (`src/types/`)**
```ts
type Plan = 'free' | 'pro'
type Currency = string          // 서버에서 허용된 ISO 4217 코드 목록으로 검증
type AnalysisStatus = 'processing' | 'completed' | 'failed'
type AnalysisErrorCode = 'not_transactions' | 'mapping_failed' | 'too_many_invalid_rows'
  | 'file_unreadable' | 'file_encrypted' | 'llm_unavailable' | 'timeout'
  | 'too_many_rows' | 'too_many_sheet_rows' | 'file_structure_limit'
  | 'unsupported_encoding' | 'mixed_currency' | 'currency_unknown' | 'storage_upload_failed'
type ApiErrorCode = 'unauthorized' | 'not_found' | 'file_too_large' | 'too_many_files'
  | 'monthly_limit' | 'duplicate_file' | 'already_pro' | 'pro_required'
  | 'analysis_in_progress' | 'storage_delete_failed'
  | 'subscription_cancel_failed' | 'account_delete_failed' | 'internal_error'

interface ReadRowsResult {
  rows: string[][]              // 원래 행 위치 유지, headerRowIndex와 일치
  truncated: boolean           // true이면 분석 금지, too_many_sheet_rows
  sourceRowCount: number | null // 원본 범위를 얻은 경우만, 반환 행수로 대체하지 않음
  encoding: 'utf-8' | 'cp949' | null // null은 바이너리 Excel
}

interface ColumnMapping {
  isTransactions: boolean
  headerRowIndex: number
  dateColumn: string
  dateFormat: string            // 예: 'YYYY.MM.DD', 'MM/DD'
  assumedYear?: number          // 날짜에 연도가 없을 때
  merchantColumn: string
  descriptionColumn?: string
  amount: { mode: 'single'; column: string; debitIsNegative: boolean }
        | { mode: 'split'; debitColumn: string; creditColumn: string }
  currency: Currency | null     // 선택한 금액열의 통화. 불명확하면 추측하지 않고 currency_unknown
  currencyColumn?: string       // 행별 통화가 있으면 검사. 원화 환산 금액열 선택 시 해당 열 기준
}
interface Transaction {
  occurredOn: string            // 'YYYY-MM-DD' 문자열 유지
  amount: number; currency: Currency; direction: 'debit' | 'credit'
  merchant: string; description?: string; category: Category
  isRecurring: boolean; anomalyType: 'duplicate' | 'spike' | null
}
interface AnalysisSummary {
  currency: Currency; totalSpend: number
  byCategory: Partial<Record<Category, number>>
  topMerchants: { merchant: string; amount: number }[]
  period: { from: string; to: string }
  transactionCount: number; skippedRows: number
}
type TransactionView = Omit<Transaction, 'isRecurring' | 'anomalyType'>
interface MonthlyTrend {
  currency: Currency
  points: { month: string; total: number }[] // YYYY-MM, 오름차순, 같은 통화의 완료 이력만
  comparison: {
    month: string; previousMonth: string
    delta: number; percent: number | null   // 전월 합계가 0이면 percent는 null
  } | null                                // 직전 달 데이터가 없으면 비교 없음
}
interface AnalysisView {        // 서버가 클라이언트로 내보내는 유일한 형태
  id: string; status: AnalysisStatus; errorCode?: AnalysisErrorCode
  failedUpload?: { id: string; filename: string } // 본인의 실패 건에만, 경로·내용은 제외
  locked: boolean
  summary?: AnalysisSummary
  transactions?: TransactionView[] // 열람 가능한 completed 분석만, 최대 3,000건
  detections?: { recurringCount: number; anomalyCount: number; items?: Transaction[] } // items는 Pro만
  trend?: MonthlyTrend         // Pro만, 현재 분석과 같은 통화의 누적 이력
  insights?: Insight[] | null   // Pro만
  insightsLocale?: 'ko' | 'en'  // 저장된 인사이트가 있는 Pro 응답만
}
```

- `processing`·`failed` 응답에는 메타데이터와 해당 오류만 포함한다. 잠긴 completed 응답에는 `id/status/locked`만 포함한다. 단순 UI 숨김 대신 허용 필드만 선택해 응답 객체를 새로 만든다.
- Free의 열람 가능한 completed 응답은 `summary/transactions/detections` 건수, Pro는 여기에 탐지 상세·`trend/insights/insightsLocale`를 더한다. 샘플 데이터도 동일 계약을 따른다.
- 추이는 현재 분석의 통화로 필터링한 본인의 완료 거래를 매번 집계한다. 가장 최근 거래 월과 그 직전 달을 비교하며, 빠진 달을 0원으로 만들거나 직전 관측 월로 대체하지 않는다. 같은 통화의 월이 1개뿐이면 비교 없이 안내를 표시한다.

**서비스 (`src/services/`)**
```ts
// claude.ts — structured outputs + zod parse
mapColumns(header: string[], sampleRows: string[][]): Promise<ColumnMapping>
classifyMerchants(merchants: string[]): Promise<Record<string, Category>> // 100개 배치, 누락분은 'other'
generateInsights(input: { summary; detections; trend? }, locale: 'ko' | 'en'): Promise<Insight[]>
// polar.ts
createCheckout(userId: string, email: string): Promise<string>   // checkout URL
cancelSubscriptions(userId: string): Promise<void> // Polar에서 현재 구독을 조회하고 추가 청구 중단 확인
// analysis-pipeline.ts
runAnalysis(userId: string, analysisId: string, files: { uploadId: string; bytes: ArrayBuffer }[]): Promise<void>
// lib/data — server-only RPC 래퍼, userId는 검증된 claims.sub만 전달
startAnalysis(userId: string, plan: Plan): Promise<{ analysisId: string }> // monthly_limit·analysis_in_progress
completeAnalysis(userId: string, analysisId: string, result: { transactions; summary; detections }): Promise<boolean> // RPC, false면 이미 timeout
failAnalysis(userId: string, analysisId: string, error: { code: AnalysisErrorCode; uploadId?: string }): Promise<void> // status='processing'일 때만
recoverStaleAnalyses(userId: string): Promise<void>
```

**순수 함수 (`src/lib/`)**
```ts
readRows(bytes: ArrayBuffer): ReadRowsResult
normalize(rows: string[][], m: ColumnMapping): { txs: RawTx[]; skipped: number; candidateRows: number }
assertSingleCurrency(currencies: (Currency | null)[]): Currency // 혼합·알 수 없는 통화는 거부
summarize(txs: Transaction[], currency: Currency): AnalysisSummary
detect(txs: Transaction[], history: Transaction[], currency: Currency): Transaction[] // 같은 통화만
monthlyTrend(history: Transaction[], currency: Currency): MonthlyTrend
resolvePlan(sub: SubscriptionRow | null): Plan            // active | trialing | past_due → pro
limits(plan: Plan): { maxFiles; maxBytesPerFile; maxRowsPerFile; maxSheetRows; monthlyAnalyses }
canViewAnalysis(plan: Plan, analysisId: string, latestCompletedId: string | null): boolean
toAnalysisView(input: { row: AnalysisRow; transactions: Transaction[]; trend: MonthlyTrend | null }, plan: Plan, locked: boolean): AnalysisView
```

**API**

| 메서드 · 경로 | 요청 | 성공 | 실패 |
|---|---|---|---|
| `POST /api/analyses` | multipart 파일 1~3개 | `201 { analysisId }` | 400 크기·개수 검증, 409 `duplicate_file`/`analysis_in_progress`, 429 `monthly_limit`, 422 파싱·통화·분석 실패, 504 `timeout` |
| `GET /api/analyses/[id]` | – | `200 AnalysisView` | 404 (타인·없음 동일) |
| `DELETE /api/analyses/[id]` | – | `204` | 404, 409 `analysis_in_progress`, 502 `storage_delete_failed` |
| `POST /api/analyses/[id]/insights` | – | `200 { insights, insightsLocale }` | 403 `pro_required`, 404, 504 `timeout` |
| `GET /api/checkout` | – | 302 Polar | 401, 409 `already_pro` |
| `GET /api/portal` | – | 302 Polar | 401, 404 |
| `POST /api/webhooks/polar` | Polar 서명 | 200 | 403 서명 불일치, 500 DB 실패(재시도 유도) |
| `DELETE /api/account` | – | 204 | 401, 502 `subscription_cancel_failed`/`storage_delete_failed`/`account_delete_failed` |

- 모든 사용자 API는 인증 실패 시 401. 앱이 만드는 실패 응답은 `{ error: { code, analysisId?, uploadId? } }`로 통일한다. 분석 생성 후 실패에는 `analysisId`, 파일별 실패에는 본인 `uploadId`를 포함하고 파일명은 본인 업로드 목록에서 표시한다. 문구는 `messages/*.json`의 `errors.<code>`.
- 플랫폼 강제 종료로 앱의 오류 응답을 만들지 못하면 일반 재시도 안내 후 대시보드에서 상태를 확인한다. 다음 서버 접근에서 정체 분석을 복구한다.
- 결과 페이지와 GET API는 같은 소유권·플랜 검사와 `toAnalysisView`를 사용한다. Free 잠금은 상세 페이지·API·목록·Client Component props 모두에 적용한다.
- 인사이트는 본인 completed 분석에만 생성하며, 기존 값이 있으면 생성 당시 언어와 함께 반환한다. 신규 생성에도 5.2.2의 SDK 호출 제한을 적용하고, 인사이트 실패가 이미 성공한 분석의 상태·사용량을 바꾸지 않게 한다.

### 5.5 에러 처리
1. 에러 코드는 `src/types/errors.ts` 한 곳에서 정의, 번역은 `messages`
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
| E3 | EUC-KR/CP949, UTF-8 BOM, 구분자 `;` `\t` | 엄격한 UTF-8 → 검증된 CP949 디코딩 후 구분자 판별. 인코딩 판별과 구분자 감지를 분리 (5.2.1) |
| E4 | 헤더 위에 제목·기간 행 | 매핑의 `headerRowIndex` |
| E5 | 하단 합계·소계 행 | 명확한 구조행 규칙으로 식별된 행만 후보에서 제외. 나머지 날짜 실패는 잘못된 후보행으로 집계 |
| E6 | 금액 `12,000원`, `₩12,000`, `(12,000)` | normalize에서 숫자 추출 |
| E7 | 입금/출금 컬럼 분리 (은행) | 매핑 `amount.mode = 'split'` |
| E8 | 취소·환불 | `credit`로 저장, 지출 합계에서 차감 |
| E9 | 할부 | 이번 달 청구액 컬럼 매핑 |
| E10 | 통화 판정·해외 결제 | 근거 순서: ① 통화 컬럼 값 ② 금액 헤더·셀의 `원`·`₩`·`KRW`·`$`·`USD` 등 표기 ③ 파일에 명시된 통화 문구(예: "(단위: 원)"). 국내 카드 명세서처럼 통화 컬럼이 없어도 ②·③으로 KRW 판정. 원화 환산 금액열이 있으면 우선 선택. 근거가 전혀 없을 때만 `currency_unknown`, 혼합이면 `mixed_currency` |
| E11 | 연도 없는 날짜 `09/01` | `assumedYear`, 12월→1월 넘어가면 연도 +1 |
| E12 | 월 집계 시간대 밀림 | 날짜는 문자열로 저장·집계, `Date` 변환 금지 |
| E13 | 빈 파일 / 헤더만 / 거래내역 아님 | `file_unreadable` / `not_transactions` |
| E14 | 잘못된 행 20% 초과 | `too_many_invalid_rows` (틀린 결과를 보여주지 않음) |
| E15 | 0원 행 | 제외 |
| E16 | 같은 날 같은 가맹점·같은 금액 2건 | 둘 다 저장, `duplicate` 이상거래로 표시 |
| E17 | 후보 거래 1,001행 이상 / 시트 1,201행 이상 | 각각 `too_many_rows` / `too_many_sheet_rows`. 잘린 앞부분을 성공 결과로 저장하지 않음 |
| E18 | 제목·빈 행·합계와 거래 1,000행 | 시트 상한 내라면 거래 1,000행 전부 분석. 구조행 때문에 거래를 누락시키지 않음 |
| E19 | 서로 다른 통화의 파일 2개 또는 행별 통화 혼재 | 파일 전체에서 선택한 금액열의 통화를 검증하고 분석 전체를 `mixed_currency`로 실패 처리 |
| E20 | 같은 사용자의 KRW·USD 분석 이력 | 추이·탐지·인사이트를 현재 분석과 동일 통화로 필터링, 집계 함수도 통화 일치를 검증 |
| E21 | 잘못된 인코딩 / 컬럼·셀 상한 초과 | `unsupported_encoding` / `file_structure_limit`로 거부, 한도 미차감 |

---

## 7. 보안

| 항목 | 방법 |
|---|---|
| 데이터 격리 | 전 테이블 RLS + 명시적 grants 회수. 금융 테이블은 서버 전용이며 조회·변경마다 claims.sub 소유권 조건 (5.3.1) |
| 유료 권한 | 상세·목록·일반 거래 목록·인사이트·RSC props의 허용 필드만 직렬화. Free에 탐지 플래그나 잠긴 원본 row를 전달하지 않음 |
| 삭제 권한 | 클라이언트 DELETE 전면 금지. Storage·Polar 처리 성공 확인 후 DB/auth 삭제 (5.3.3) |
| 키 관리 | `SUPABASE_SECRET_KEY`, `ANTHROPIC_API_KEY`, `POLAR_*`는 서버 전용, admin 클라이언트에 `import 'server-only'` |
| 서비스 키 사용 시 | 사용자 요청에서는 `user_id = claims.sub`와 대상 row 소유권을 함께 검사. 웹훅은 검증된 Polar external ID를 사용자에 매핑. 요청값이나 소유권 미검증 DB row만으로 권한 판단 금지 |
| 인증 확인 | `getClaims()` 사용 (`getSession()`으로 권한 판단 금지) |
| 구독 변경 | 실제 결제 모드는 서명 검증된 웹훅으로만 (`@polar-sh/nextjs` `Webhooks`). 명시적 Polar mock 모드의 예외는 11.3에 한정 |
| 파일 업로드 | 서버가 크기·개수·행수 검증, 저장 경로는 서버가 생성, 원본 파일명은 텍스트로만 표시 |
| 파서 자원 고갈 | 후보 거래 1,000행·시트 1,200행(`sheetRows: 1201`), 컬럼 50·셀 500자 (5.2.1). 1MB 입력 한도 + 요청 단위 실패라 압축 해제 사전 검사는 생략 |
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
- 환경 변수: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `ANTHROPIC_API_KEY`, `CLAUDE_MODEL`, `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_PRO_PRODUCT_ID`, `POLAR_SERVER`, `NEXT_PUBLIC_APP_URL`, `MOCK_SERVICES` (예: `claude,polar`, 실제 전환 시 삭제)
- Supabase 프로젝트는 2개: **개발용**(4~11단계 배포·통합 테스트, 로컬 `.env.local`), **운영용**(12단계에서 생성). 통합 테스트는 운영 프로젝트에 절대 연결하지 않는다
- 사전 준비 (사용자):
  - 구현 시작 전: `! npx vercel login`
  - 4단계 전: Supabase 개발 프로젝트 생성 + `! npx supabase login`, 키 3개를 `.env.local`에 기록
  - 5단계 전: Google OAuth 클라이언트, Supabase 이메일 템플릿을 `token_hash` 방식으로 수정
  - 12단계 전: Supabase 운영 프로젝트, Anthropic API 키, Polar 샌드박스 + Pro 상품
