# Step 9: analysis-read-delete

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/AGENTS.md`
- `/docs/ARCHITECTURE.md` (5.3.1 접근 권한·조회 순서·목록 노출 필드, 5.3.3 분석 삭제, 5.4 `AnalysisView`·API 표의 DELETE·insights, 인사이트 규칙, 12.1 R1·R4·R8)
- `/docs/USER_FLOW.md` (시나리오 3.4, 5.3, 6.1)
- `/docs/ADR.md` (ADR-003, ADR-010, ADR-011)
- 이전 step 산출물: `src/lib/data/`, `src/lib/plan.ts`(toAnalysisView), `src/lib/analysis/`(monthlyTrend), `src/services/claude.ts`(generateInsights), `src/app/api/analyses/route.ts`, `src/lib/api-error.ts`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

테스트를 먼저 작성하라 (TDD). 단위 테스트는 admin 클라이언트·Storage·Claude를 mock한다.

1. **`lib/data` 읽기** (server-only, 모든 쿼리 `id = ? AND user_id = userId`)
   - `getAnalysisView(userId, analysisId): Promise<AnalysisView | null>` — `recoverStaleAnalyses` → 소유권 조회(없거나 타인 것이면 null) → `getUserPlan` → completed면 거래 조회, Pro면 본인 completed 이력으로 `monthlyTrend` → `toAnalysisView`. failed면 `failed_upload_id`가 같은 분석의 upload인지 확인 후 filename만
   - `listAnalyses(userId): Promise<AnalysisListItem[]>` — 타입을 `src/types/`에 추가: `{ id; status; createdAt; errorCode?; filenames: string[]; totalSpend?: number; periodTo?: string }`. 거래·탐지·추이·인사이트는 넣지 않는다 (5.3.1)
   - `getAnalysisForInsights(userId, analysisId)` — 본인 completed 분석의 summary·detections·기존 insights
   - `saveInsights(userId, analysisId, insights)` — `insights is null`일 때만 저장 (status·usage를 바꾸지 않음)
2. **`src/services/deletion.ts`** — `deleteAnalysis(userId: string, analysisId: string): Promise<'deleted' | 'not_found' | 'in_progress'>`
   - 순서(5.3.3): 소유권 확인 → `recoverStaleAnalyses` → processing이면 `in_progress` → Storage `{userId}/{analysisId}/` prefix의 객체를 **페이지 끝까지 list**해 파일 경로로 삭제 → 다시 list해 비었는지 확인 → DB analyses 삭제(cascade). 원본이 이미 없으면 성공. Storage 실패 시 DB를 건드리지 않고 `StorageDeleteError` 던짐
   - `analysis_usage`는 건드리지 않는다
3. **라우트**
   - `src/app/api/analyses/[id]/route.ts` `DELETE` — 401 / 404 `not_found` / 409 `analysis_in_progress` / 502 `storage_delete_failed` / 204. Next 16에서 `params`는 `Promise`다
   - `src/app/api/analyses/[id]/insights/route.ts` `POST` — 401 → 본인 completed 분석 아니면 404 → Free면 403 `pro_required` → 기존 insights가 있으면 그대로 200 → `generateInsights` → `saveInsights` → `200 { insights }`. Claude timeout은 504 `timeout`, 그 외 실패는 502가 아니라 `apiError('internal_error', 500)`. 실패해도 분석 상태·사용량을 바꾸지 않는다
4. **테스트**
   - 다른 사용자 ID로 getAnalysisView·DELETE·insights → 404와 동일 결과 (R1, R4)
   - Free completed view에 trend·insights·items·플래그 없음, Pro에는 있음 (R4, R8). processing/failed view 허용 필드
   - listAnalyses 결과에 거래·탐지·insights 키가 없음
   - deleteAnalysis: Storage list 페이지네이션(예: 2페이지), Storage 실패 시 DB delete 미호출, 이미 없는 원본 → 성공, processing → in_progress
   - insights: Free 403, 기존 값 재사용 시 generateInsights 미호출, 생성 실패가 분석 상태를 바꾸지 않음

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
   - AGENTS.md CRITICAL 규칙을 위반하지 않았는가? (`lib/data`의 모든 select/update/delete에 `user_id` 조건이 있는지 직접 확인)
3. 결과에 따라 `phases/0-mvp/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 분석 결과 조회용 GET API를 만들지 마라. 이유: 결과 페이지(Server Component)가 `getAnalysisView`를 직접 호출한다(PRD 제외 사항).
- 타인 분석에 403을 주지 마라. 이유: 존재 여부가 노출된다. 알 수 없는 ID와 똑같이 404.
- DB를 먼저 지우고 Storage를 나중에 지우지 마라. 이유: Storage 실패 시 원본 경로를 잃어 정리할 수 없다(ADR-011).
- Storage의 '폴더' 이름으로 삭제를 요청하지 마라. 이유: 객체가 남는다. 파일 경로 목록으로 삭제한다.
- 삭제 시 `analysis_usage`를 지우지 마라. 이유: 삭제로 한도를 우회할 수 없어야 한다(R2).
- 기존 테스트를 깨뜨리지 마라
