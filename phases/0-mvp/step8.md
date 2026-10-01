# Step 8: analysis-create

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/AGENTS.md`
- `/docs/ARCHITECTURE.md` (5.2 분석 흐름 전체, 5.2.1, 5.2.2, 5.3.2, 5.3.3의 업로드 경로 규칙, 5.4 API 표의 `POST /api/analyses`, 5.5 에러 처리)
- `/docs/USER_FLOW.md` (J2, 시나리오 2.1~2.5, 5.1, 5.2)
- `/docs/ADR.md` (ADR-002, ADR-009, ADR-011)
- 이전 step 산출물: `src/lib/sheet/`, `src/lib/analysis/`, `src/services/claude.ts`·`claude-errors.ts`, `src/lib/data/`, `src/lib/auth.ts`, `src/lib/plan.ts`, `src/lib/api-error.ts`, `src/lib/log.ts`, `supabase/migrations/`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

테스트를 먼저 작성하라 (TDD). 단위 테스트는 `lib/data`·Storage·Claude 서비스를 mock한다.

1. **`lib/data` 추가** (server-only, `user_id` 조건 필수)
   - `findCompletedDuplicate(userId, hashes: string[]): Promise<boolean>` — 본인 **completed** 분석의 uploads에 같은 `file_hash`가 있는지
   - `createUpload(userId, analysisId, { uploadId, filename, storagePath, fileHash }): Promise<void>`, `setUploadMapping(userId, uploadId, { rowCount, columnMapping })`
   - `getCompletedHistory(userId, excludeAnalysisId): Promise<Transaction[]>` — 본인·completed 분석의 거래만
   - `uploadOriginal(storagePath, bytes)` — 서버 Storage 업로드 (`csv-uploads` 버킷, admin 클라이언트)
2. **`src/services/analysis-pipeline.ts`** — `runAnalysis(userId, analysisId, plan, files: { uploadId: string; bytes: ArrayBuffer }[]): Promise<void>`
   - 파일별 `readRows` → `mapColumns(header 후보, sample, plan)` → `isTransactions`가 false면 `not_transactions`, `isKrw` false면 `unsupported_currency` → `normalize` → 고유 가맹점 `classifyMerchants` → 거래 합치기 → `getCompletedHistory` → `detect` → `summarize`(`skippedRows`는 normalize 결과 합으로 채움) → 탐지 건수 → `completeAnalysis`
   - 파일 하나라도 실패하면 분석 전체 실패, 실패 파일의 `uploadId`를 함께 기록 (5.1)
   - `completeAnalysis`가 false면 이미 timeout 처리된 것 → `timeout`으로 취급
   - 실패 시 `failAnalysis(userId, analysisId, { code, uploadId })` 후 `PipelineError { code, uploadId? }`를 던진다. 예외 원문은 저장·로그 금지, `logError('analysis_failed', { code, analysisId, durationMs })`만
3. **`src/app/api/analyses/route.ts`** — `POST`, `export const maxDuration = 300`, `runtime = 'nodejs'`
   - 순서(5.2): `getUserId()` 없으면 401 `unauthorized` → `getUserPlan` → multipart 파일 수(1~`maxFiles`, 초과 400 `too_many_files`)·크기(`maxBytesPerFile` 초과 400 `file_too_large`) → 파일별 sha256 → `findCompletedDuplicate`면 409 `duplicate_file` → `startAnalysis`(429 `monthly_limit`, 409 `analysis_in_progress`) → 파일별 `uploadId` 생성, 경로 `{userId}/{analysisId}/{uploadId}` → **uploads 기록 먼저**, 그다음 Storage 저장(실패 시 `storage_upload_failed`로 failAnalysis) → `runAnalysis` → `201 { analysisId }`
   - 실패 응답: `apiError(code, status, { analysisId, uploadId })` — 파싱·통화·분석 오류 422, `timeout` 504, `llm_unavailable` 422
   - 원본 파일명은 저장·표시용 텍스트로만 쓰고 경로에 넣지 마라
4. **테스트**
   - 라우트: 401, 파일 수·크기 400, 중복 409, 한도 429, 처리 중 409, 성공 201, 파이프라인 실패 시 422 + analysisId·uploadId, timeout 504
   - 파이프라인: 3개 중 1개 실패 → 전체 실패 + 해당 uploadId (5.1), `completeAnalysis` false → timeout, 성공 시 completeAnalysis에 들어가는 summary가 summarize 결과와 일치, 실패 경로에서 거래 저장 함수가 호출되지 않음
   - uploads 기록이 Storage 업로드보다 먼저 호출됨 (호출 순서 assert)

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
   - AGENTS.md CRITICAL 규칙을 위반하지 않았는가? (`completeAnalysis` RPC 외에서 transactions insert가 없는지 `grep -rn "from('transactions')" src/`)
3. 결과에 따라 `phases/0-mvp/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- `after()`·백그라운드 작업·상태 폴링을 쓰지 마라. 이유: 분석은 요청 한 번에 동기 처리한다(ADR-002).
- 클라이언트 연결 종료(`request.signal`)로 분석을 중단하지 마라. 이유: 업로드 도착 후에는 끝까지 처리한다(2.1).
- 실패한 분석의 원본·uploads를 지우지 마라. 이유: 실패 원인 확인과 사용자 삭제를 위해 유지한다.
- 일부 파일만 성공한 결과를 저장하지 마라. 이유: 부분 성공은 MVP에서 다루지 않는다(5.1).
- 파일 내용·가맹점명·예외 메시지를 로그나 `error_code` 외 컬럼에 남기지 마라. 이유: AGENTS.md CRITICAL.
- 기존 테스트를 깨뜨리지 마라
