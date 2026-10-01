# Step 11: result-view

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/AGENTS.md`
- `/docs/PRD.md` (4. 대시보드 표, 샘플 결과)
- `/docs/USER_FLOW.md` (J3, 시나리오 3.3, 3.4, 6.1)
- `/docs/ARCHITECTURE.md` (5.1의 `dashboard/analyses/[id]`·`sample/`·`sample/analysis.json`, 5.3.1, 5.4 `AnalysisView`·`MonthlyTrend`와 추이 규칙, 12.1 R8)
- `/docs/UI_GUIDE.md`
- `/.claude/skills/finsight-design/SKILL.md` ("결과", "샘플 결과" 절, 이식 규칙 5~10)
- `/docs/design/fs-ui.jsx` (SectionHead, KPI, Delta, CategoryBars, ShareStrip, TopMerchants, TxTable, LockCard, RecurringPanel, AnomalyPanel, TrendPanel, InsightsPanel)
- `/docs/design/fs-app.jsx` (`Result`, **`LayoutGrid`**만 — `report`·`split`은 구현하지 않음)
- `/docs/design/fs-data.jsx` (샘플 데이터 모양 참고용)
- `/docs/design/FinSight.html` `<style>` (`.fs-grid`, `.fs-kpi`, `.fs-bars`, `.fs-strip`, `.fs-tx`, `.fs-trend`, `.fs-ins`, `.fs-hide-sm` 등 `grep`)
- 이전 step 산출물: `src/lib/data/`(getAnalysisView), `src/types/`(AnalysisView 등), `src/lib/format.ts`, `src/components/ui/`(LockCard 포함), `src/app/api/analyses/[id]/insights/route.ts`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

컴포넌트 테스트를 먼저 작성하라 (TDD). 모든 결과 컴포넌트는 **`AnalysisView` 하나만** 입력으로 받는다(샘플과 실제 결과가 같은 계약, R8).

1. **`src/app/dashboard/analyses/[id]/page.tsx`** (Server Component, `params`는 Promise) — `getUserId()` → `getAnalysisView` → null이면 `notFound()`. processing이면 `분석 중` 안내 + 대시보드 링크, failed면 에러 문구(`messages/errors.ts`) + 실패 파일명. completed면 `ResultView`. AppHeader `active="dashboard"`
2. **`src/components/dashboard/result/`** — `ResultView({ view: AnalysisView; mode: 'user' | 'sample' })` + 패널들 (SKILL.md "결과" 절 그대로, grid 레이아웃)
   - 헤더: 브레드크럼(`대시보드 / {formatMonthTitle}`, 샘플은 `홈 / …`), h1 `{제목} 지출`, 오른쪽 `거래 N건`
   - KPI 4개: 총지출(+Pro는 Delta, Free는 건수) / 일평균(`totalSpend / 기간 일수`, 일수는 `lib/format.ts`나 `lib/analysis`에 순수 함수로 추가하고 테스트. `Date.UTC`로 일수만 계산 가능, 로컬 시간 `Date` 금지) / 정기결제 N건(Pro `월 ₩{recurring items 합}`, Free `상세는 Pro`) / 이상거래 N건
   - 카테고리별 지출(비중 스트립 + 막대, 잉크 계조, 행 클릭 시 거래 표 필터 + `필터 해제`) / 상위 가맹점 5개
   - 월별 추이·AI 인사이트: Free(`view.trend`·`view.insights` 키 없음)면 LockCard. Pro: 추이 막대 6개월(최근 월 잉크, `formatManWon` 라벨) + `comparison`이 null이면 `전월 데이터 없음`. 카테고리 변화 4행은 데이터 계약에 전월 카테고리가 없으므로 **생략**한다
   - 인사이트(Pro): `insights`가 null이면 idle(`인사이트 생성` → `POST /api/analyses/{id}/insights`) → loading(`거래 N건을 살펴보는 중…`) → done(`예상 절약 가능액 월 ₩{monthlySaving 합}` + 번호 목록). 실패 시 문구 + 다시 시도. 샘플 모드는 저장된 insights를 바로 표시
   - Pro만: 정기결제 패널(`detections.items` 중 `isRecurring`, 가맹점별로 묶어 가맹점·최근 결제일·금액. 계약에 없는 `N개월 연속·다음 결제`는 표시하지 않는다) / 이상거래 패널(유형 Badge `중복 결제`·`급증` + 가맹점·날짜·금액). Free는 KPI의 건수만, 상세 패널 대신 LockCard(`N건 발견`)
   - 거래 내역: 가맹점 검색 Input + `N건 · ₩합계`, 열 날짜·가맹점(+설명 캡션)·카테고리(좁은 화면 숨김)·금액(오른쪽, credit은 `-`). 날짜 내림차순, 10행 + `전체 보기 (N)`. 출처 열은 데이터 계약에 업로드 ID가 없으므로 만들지 않는다. Pro는 `detections.items`의 duplicate 거래에 sale 색 `중복 의심` 플래그
   - 모든 가맹점명·인사이트는 텍스트로 렌더
   - Pro 잠금 판단은 **`view`의 키 존재 여부만** 본다(별도 `plan` prop으로 판단하지 마라). 업그레이드 CTA는 `/api/checkout`
3. **샘플** — `src/sample/analysis.json`: completed Pro 형태의 `AnalysisView`(`id: 'sample'`, 거래 40~80건, 9월 명세서, 정기결제·중복·급증 포함, trend 6개월 + comparison, insights 3개). **summary·detections·trend 숫자는 sample 거래에서 `summarize`·`detect`·`monthlyTrend`로 계산한 값과 일치**해야 한다(테스트로 검증, 생성 스크립트를 써도 됨). 가맹점은 실제 브랜드처럼 보여도 되는 일반 명칭 사용
4. **`src/app/sample/page.tsx`** (공개) — 로그인 여부에 따라 PublicHeader(`signedIn`), 맨 위 잉크 바 `샘플 결과 · 실제 명세서 예시로 만든 결과입니다. Pro 기능까지 모두 보여드립니다.` + `무료로 시작하기`(on-image sm, `/signup`), `ResultView mode="sample"`
5. **테스트**: Free view → 추이·인사이트 LockCard, 정기결제/이상거래 상세 없음, 거래 목록 렌더 / Pro view → 추이 막대·Delta·상세 패널 / comparison null → `전월 데이터 없음` / 카테고리 클릭 필터·해제 / 검색 / 인사이트 상태 전이(fetch mock) / sample JSON 숫자 일치 / 일평균 일수 계산

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
   - AGENTS.md CRITICAL 규칙을 위반하지 않았는가?
   - `grep -rn "dangerouslySetInnerHTML\|react-markdown\|recharts" src/components/dashboard/` (차트는 div 막대로 그린다)
3. 결과에 따라 `phases/0-mvp/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 클라이언트에서 금액 합계·추이를 새로 계산하지 마라(표시용 단순 합: 필터된 거래 합계·recurring 합계·monthlySaving 합은 예외). 이유: 집계는 `lib/analysis` 결과를 쓴다.
- 잠긴 패널에 가짜 데이터를 흐리게 깔지 마라. 이유: UI_GUIDE 규칙이며 Free에는 상세 데이터가 오지 않는다.
- 결과 조회 GET API를 만들지 마라. 이유: Server Component가 `getAnalysisView`를 직접 호출한다.
- `report`·`split` 레이아웃, `TweaksPanel`, 데모 버튼을 구현하지 마라. 이유: 프로토타입 비교안이다.
- 날짜를 `new Date(str)`로 파싱해 표시하지 마라. 이유: 시간대 밀림. 문자열 slice를 쓴다.
- 기존 테스트를 깨뜨리지 마라
