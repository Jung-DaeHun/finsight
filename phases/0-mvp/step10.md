# Step 10: dashboard-upload

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/AGENTS.md`
- `/docs/USER_FLOW.md` (3. 화면 흐름, J2, 시나리오 2.1~2.5, 5.1, 5.2)
- `/docs/ARCHITECTURE.md` (5.1, 5.2 응답 형식, 5.3.1 목록 노출 필드, 5.4 API 표의 `POST /api/analyses` 실패 코드)
- `/docs/UI_GUIDE.md`
- `/.claude/skills/finsight-design/SKILL.md` ("대시보드", "분석 중" 절, 이식 규칙)
- `/docs/design/fs-app.jsx` (`Dashboard`, `Upload`, `Analyzing`)
- `/docs/design/fs-ui.jsx` (`LockCard`)
- `/docs/design/FinSight.html` `<style>` (`.fs-drop`, `.fs-meter`, `.fs-row`, `.fs-empty`, `.fs-steps` 등 `grep`)
- 이전 step 산출물: `src/components/ui/`, `src/lib/format.ts`, `src/lib/data/`(listAnalyses, countMonthlyUsage, getUserPlan, recoverStaleAnalyses), `src/lib/auth.ts`, `src/lib/plan.ts`(limits), `src/messages/errors.ts`, `src/app/api/analyses/route.ts`, 임시 `src/app/dashboard/page.tsx`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

컴포넌트 테스트를 먼저 작성하라 (TDD). 결과 페이지는 이 step 범위가 아니다(result-view step).

1. **`src/app/dashboard/page.tsx`** (Server Component) — 임시 페이지 교체
   - `getUserId()` → `recoverStaleAnalyses` → `getUserPlan`, `countMonthlyUsage`, `listAnalyses` → 아래 Client Component에 **필요한 값만** props로 전달 (`plan`, `used`, `limit`, `maxFiles`, 목록 item)
   - AppHeader(`active="dashboard"`), PageTitle `대시보드` + 사용량 미터(`이번 달 분석` · `N / 5회` · 72×4px 막대) + `새 분석`(plus, `#upload`로 이동)
2. **`src/components/dashboard/`**
   - `EmptyState` — 분석이 0건일 때: `첫 명세서를 올려 보세요` + 설명 + [파일 올리기(`#upload`)][샘플 결과 체험(`/sample`)]
   - `AnalysisList` — `내 분석 (N)` SectionHead + 행 버튼: 제목(`formatMonthTitle(periodTo)`, 실패면 `분석 실패` + 에러 문구, 처리 중이면 `분석 중`) · 파일명들(` · `) / 생성일(좁은 화면 숨김) / 총지출 / chevron-right. completed·failed 행은 `/dashboard/analyses/{id}`로 링크
   - Free면 목록 아래 `LockCard`(이 step에서 `src/components/ui/LockCard.tsx`로 만든다: soft-cloud + 자물쇠 아이콘 박스 + 제목·설명 + `Pro로 업그레이드` sm 버튼 → `/api/checkout`) — `카드·계좌 여러 개를 한 번에`
   - `UploadForm` (`id="upload"`, 좁은 폭 880) — 드롭존(드래그 상태), 파일 목록(이름·`formatBytes`·제거), 클라이언트 사전 검증(확장자 csv/xls/xlsx, 1MB, `maxFiles` 초과 시 Free면 `Pro로 업그레이드` 포함 에러 박스), 하단 저장 안내 캡션(원본이 비공개 저장소에 저장됨, 첫 시트만 읽음) + `분석 시작` / `분석 시작 (N개 파일)` / 한도 소진 시 비활성 `이번 달 분석 횟수를 모두 사용했습니다`
   - 제출: `fetch('/api/analyses', { method: 'POST', body: FormData })`. 진행 중 버튼 비활성(2.3). 201 → `router.push('/dashboard/analyses/{id}')`. 401 → `/login`(2.4). 실패 → `messages/errors.ts` 문구 + `uploadId`가 있으면 해당 파일명 표시 (5.1). 네트워크 오류·플랫폼 강제 종료(JSON 아님)는 일반 재시도 안내 + 대시보드 새로고침 안내
   - `Analyzing` — 제출 중 업로드 폼 대신 표시: 스피너 40 + `명세서를 분석하고 있습니다` + 파일명 + 단계 5개(SKILL.md 문구) + `창을 닫지 마세요…`. 서버 진행 이벤트가 없으므로 시간 기반으로 넘기고 마지막 단계에서 응답을 기다린다
3. **테스트**: 빈 상태/목록 전환, 사용량 미터 텍스트, 한도 소진 시 버튼 비활성 문구, Free 2개 파일 선택 시 에러 + 업그레이드 버튼, 1MB 초과 에러, 제출 중 버튼 비활성, 422 응답의 uploadId → 파일명 표시, 401 → 로그인 이동, 단계 표시가 마지막 단계에서 멈춤(fake timers)

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
   - AGENTS.md CRITICAL 규칙을 위반하지 않았는가? (Client Component props에 DB row가 들어가지 않는지)
   - UI_GUIDE 안티패턴: `grep -rn "shadow\|gradient\|backdrop-blur\|dangerouslySetInnerHTML" src/`
3. 결과에 따라 `phases/0-mvp/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 브라우저에서 Supabase 테이블·Storage에 직접 업로드·조회하지 마라. 이유: 모든 데이터 접근은 서버에서만(5.3.1, ADR-002).
- 클라이언트 사전 검증을 서버 검증 대신으로 쓰지 마라. 이유: 서버가 다시 검증한다. 클라이언트 검증은 안내용이다.
- 분석 상태 폴링을 만들지 마라. 이유: 동기 처리(ADR-002).
- `fs-data.jsx` 목업 데이터나 `localStorage` 상태를 가져오지 마라. 이유: 프로토타입 전용.
- 파일명을 `dangerouslySetInnerHTML`로 렌더하지 마라. 이유: XSS.
- 기존 테스트를 깨뜨리지 마라
