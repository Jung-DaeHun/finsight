# Step 6: db-schema

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/AGENTS.md`
- `/docs/ARCHITECTURE.md` (5.2 분석 흐름 3·10단계, 5.2.2 정체 복구, 5.3 데이터베이스, 5.3.1 접근 권한, 5.3.2 월 사용량, 5.4 lib/data 인터페이스, 7절 보안, 10절 환경 변수·Supabase 프로젝트, 12절 통합 테스트 범위, 12.1 R1·R2·R4·R5)
- `/docs/ADR.md` (ADR-003, ADR-009, ADR-014)
- 이전 step 산출물: `src/types/`(AnalysisRow, SubscriptionRow, Transaction, AnalysisSummary, AnalysisErrorCode), `src/lib/plan.ts`(resolvePlan, limits), `vitest.config.ts`, `package.json`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 사전 확인

아래 중 하나라도 없으면 아무것도 만들지 말고 `blocked` 처리한다:
- `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_DB_PASSWORD`
- `npx supabase projects list`가 성공 (로그인됨)
- `blocked_reason` 예: "Supabase 개발 프로젝트 생성 후 키 3개와 SUPABASE_DB_PASSWORD를 .env.local에 기록, `! npx supabase login` 실행 필요"

## 작업

통합 테스트를 먼저 작성하고 마이그레이션으로 통과시켜라 (TDD).

1. **Supabase CLI**: `supabase` devDependency, `npx supabase init`(없으면), `.env.local`의 URL에서 project ref를 추출해 `npx supabase link --project-ref <ref> -p "$SUPABASE_DB_PASSWORD"`
2. **마이그레이션** `supabase/migrations/<timestamp>_init.sql` — ARCHITECTURE 5.3 그대로
   - 테이블 5개(`subscriptions`, `analyses`, `uploads`, `transactions`, `analysis_usage`), `user_id`는 `auth.users(id) on delete cascade`
   - `transactions.amount bigint check (amount > 0)`, `occurred_on date`, `direction`·`status`·`category`·`anomaly_type`은 check 제약
   - `uploads`·`transactions` → `analyses(id) on delete cascade`. `analysis_usage`는 analyses FK 없음, `auth.users` cascade만
   - 인덱스: `transactions(user_id, occurred_on)`, `uploads(user_id, file_hash)`, `analysis_usage(user_id, usage_month)`, `create unique index ... on analyses(user_id) where status = 'processing'`
   - 모든 테이블 `enable row level security`, 정책 없음. `revoke all on all tables in schema public from anon, authenticated`
   - **`complete_analysis(p_user_id uuid, p_analysis_id uuid, p_transactions jsonb, p_summary jsonb, p_detections jsonb) returns boolean`** — 한 함수 안에서: `update analyses set status='completed', summary, detections, completed_at=now() where id and user_id and status='processing'` → 0건이면 `false` 반환(아무것도 쓰지 않음) → transactions insert(jsonb 배열 → row) → `analysis_usage` insert(`usage_month` = 해당 분석 `created_at`의 UTC 월 첫날) → `true`. 중간 오류는 예외로 전체 rollback. `security definer`가 필요 없으면 쓰지 말고, `revoke execute ... from public, anon, authenticated` + `grant execute ... to service_role`
   - Storage: private 버킷 `csv-uploads`(`file_size_limit` 1MB), `storage.objects`에 클라이언트 정책을 만들지 않는다
3. **적용**: `npx supabase db push -p "$SUPABASE_DB_PASSWORD"` (개발 프로젝트)
4. **Vercel env**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`를 `vercel env add <NAME> production`으로 등록(값은 `.env.local`에서 stdin으로). `SUPABASE_DB_PASSWORD`는 Vercel에 올리지 마라
5. **`src/lib/supabase/`**: `@supabase/ssr`, `@supabase/supabase-js` 설치
   - `server.ts` — `createServerClient`(publishable key + Next `cookies()`), 인증 확인용
   - `browser.ts` — `createBrowserClient`(publishable key), auth 전용
   - `admin.ts` — `import 'server-only'`, secret key 클라이언트(세션 저장 안 함)
   - `src/lib/auth.ts` — `getUserId(): Promise<string | null>`: `supabase.auth.getClaims()`의 `claims.sub`. `getSession()`·`getUser()`로 권한 판단 금지
6. **`src/lib/data/`** (`import 'server-only'`, admin 클라이언트 사용, **모든 쿼리에 `user_id = userId` 조건**)
   ```ts
   getUserPlan(userId: string): Promise<Plan>                    // subscriptions → resolvePlan
   recoverStaleAnalyses(userId: string): Promise<void>           // 6분 넘은 processing → failed/timeout
   startAnalysis(userId: string, plan: Plan): Promise<{ analysisId: string }>
     // recoverStale → 이번 달(UTC) analysis_usage 수 ≥ limits(plan).monthlyAnalyses면 DataError('monthly_limit')
     // → insert processing. unique 위반(23505)이면 DataError('analysis_in_progress')
   countMonthlyUsage(userId: string): Promise<number>
   completeAnalysis(userId: string, analysisId: string, result: { transactions: Transaction[]; summary: AnalysisSummary; detections: { recurringCount: number; anomalyCount: number } }): Promise<boolean> // RPC
   failAnalysis(userId: string, analysisId: string, error: { code: AnalysisErrorCode; uploadId?: string }): Promise<void> // status='processing'일 때만
   ```
   - `DataError { code: ApiErrorCode }`. row ↔ 도메인 타입 변환(snake_case → camelCase)은 이 디렉토리 안에서만
7. **통합 테스트** (`*.integration.test.ts`, `vitest.integration.config.ts`가 `.env.local`을 로드, `"test:integration"` 스크립트. 기본 `npm run test`에서는 제외)
   - 시작 시 `NEXT_PUBLIC_SUPABASE_URL`이 `.env.go-live.local`의 운영 URL과 같으면 즉시 실패시키는 가드
   - admin API로 테스트 사용자 2명 생성(이메일 인증 완료 상태) → publishable key로 로그인한 토큰과 anon으로 5개 테이블 SELECT/INSERT/UPDATE/DELETE 및 `complete_analysis` RPC가 모두 거부됨 (R4, R1)
   - `complete_analysis`: 성공 시 거래·usage 1건·completed 전환, `processing`이 아니면 false이고 아무것도 안 씀, 거래 중 하나가 check 위반이면 전체 rollback (R5)
   - 같은 사용자 processing 2건 insert → unique 위반 (R2). 분석 삭제 후에도 usage row 유지 (R2)
   - 테스트 후 생성한 사용자 삭제(cascade)

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run test:integration
npm run deploy
npm run smoke
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - ADR 기술 스택을 벗어나지 않았는가?
   - AGENTS.md CRITICAL 규칙을 위반하지 않았는가? (`grep -rn "getSession\|SUPABASE_SECRET_KEY" src/`로 사용 위치 확인)
3. 결과에 따라 `phases/0-mvp/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- RLS 정책이나 `authenticated` grant를 추가하지 마라. 이유: 클라이언트는 어떤 테이블에도 직접 접근하지 않는다(5.3.1). 소유권은 `lib/data`의 `user_id` 조건이 지킨다.
- `user_id`를 요청 본문·쿼리스트링에서 받지 마라. 이유: 검증된 `claims.sub`만 쓴다.
- 거래 insert·완료 전환·사용량 기록을 `complete_analysis` 밖에서 하지 마라. 이유: 원자성·늦은 완료 차단(ADR-009).
- 실패·timeout 분석을 `analysis_usage`에 기록하지 마라. 이유: 성공만 차감한다.
- 통합 테스트를 운영 프로젝트에 연결하지 마라. 이유: AGENTS.md CRITICAL. `.env.local`은 개발 프로젝트 전용이다.
- 기존 테스트를 깨뜨리지 마라
