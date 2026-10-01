# Step 4: ui-kit

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/AGENTS.md`
- `/docs/UI_GUIDE.md` (전체)
- `/.claude/skills/finsight-design/SKILL.md` (원본 파일 읽는 법, 이식 규칙, 공통 레이아웃)
- `/docs/design/_ds/finsight-design-system-e79c280c-6dd2-4b0e-a5eb-f14f2983571a/tokens/*.css` (토큰 원본)
- `/docs/design/_ds/finsight-design-system-e79c280c-6dd2-4b0e-a5eb-f14f2983571a/_ds_bundle.js` (`grep "function Button"` 등으로 Button·IconButton·Badge·FilterChip·Field 구현 확인)
- `/docs/design/FinSight.html` `<style>` (`.fs-head`, `.fs-mark`, `.fs-toast`, `.fs-demo` 등 `grep`)
- `/docs/design/fs-ui.jsx` (`Wordmark`, `PublicHeader`, `AppHeader`)
- `/docs/ARCHITECTURE.md` (5.1, 11.2 mock 모드의 "데모 모드" 띠)
- 이전 step 산출물: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/types/`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

공용 UI 기반만 만든다. 개별 화면(랜딩·인증·대시보드·결과·설정)은 만들지 않는다. 컴포넌트 테스트를 먼저 작성하라 (TDD).

1. **토큰** — `src/app/globals.css`에 토큰 CSS 변수를 그대로 옮기고 Tailwind v4 `@theme`에 연결(`bg-ink`, `text-mute`, `border-hairline`, `rounded-pill` 등). 하드코딩 hex는 globals.css의 변수 정의에만 둔다
2. **폰트** — `next/font/google`로 Inter, Noto Sans KR(400/500/700), Bebas Neue(400)를 로드해 `--font-body`·`--font-display` 변수에 연결 (`src/app/layout.tsx`)
3. **`lucide-react` 설치**, **`src/components/ui/`** (TSX, Tailwind 클래스 + CSS 변수, 인라인 style 최소화)
   - `Button` — variant `primary | secondary | on-image`, size `sm(36) | md(48) | lg(64)`, `fullWidth`, `icon`, disabled. `href`가 있으면 `next/link`로 렌더
   - `IconButton` — 원형 40/36, `ghost | soft`, `aria-label` 필수(타입으로 강제)
   - `Badge` — 기본(흰 배경+hairline) / `inverse`(잉크, Pro용)
   - `FilterChip` — 활성 시 잉크 반전, `aria-pressed`
   - `Field` — label + input(높이 48, radius 24, focus 2px 잉크) + hint + error(`--sale` 12px), `aria-invalid`·`aria-describedby` 연결
   - `Icon` — lucide 아이콘 이름→컴포넌트 래퍼(size 기본 16~20, currentColor)
   - `Spinner`, `Toast`(하단 중앙 잉크 pill, 2.6초 후 사라짐), `Wordmark`(소문자 `finsight`, 링크)
   - `SectionHead`(제목 + `(개수)` + 오른쪽 액션, 아래 1px 잉크 선), `PageTitle`(h1 32px + 보조 문구 + 오른쪽 액션)
4. **헤더** (`src/components/ui/`에 둔다. 5.1에 없는 `components/layout/` 같은 디렉토리를 만들지 마라)
   - `PublicHeader({ signedIn: boolean })` — SKILL.md 공통 레이아웃대로. 링크: `/#features`, `/#pricing`, `/sample`, `/login`, `/signup`, `/dashboard`
   - `AppHeader({ plan: Plan; email: string; active: 'dashboard' | 'settings' })` — 탭 `대시보드`(`/dashboard`) · `새 분석`(`/dashboard#upload`) · `설정`(`/settings`), 플랜 Badge, 이메일, `로그아웃` 버튼. 로그아웃 동작은 `onSignOut` prop 또는 form action 자리만 두고 실제 Supabase 호출은 하지 않는다 (auth-flow step에서 연결)
5. **데모 모드 띠** — `src/components/ui/DemoBanner.tsx`. `src/lib/mock.ts`에 `isMocked(service: 'claude' | 'polar'): boolean`(`process.env.MOCK_SERVICES`를 콤마로 분리해 정확히 일치)을 만들고, 루트 layout(Server Component)에서 하나라도 mock이면 전 화면 상단에 `데모 모드` 띠를 표시
6. **`src/lib/format.ts`** (순수 함수, 테스트 필수)
   - `formatWon(n: number): string` → `₩` + `toLocaleString('ko-KR')` (음수는 `-₩1,000`)
   - `formatManWon(n: number): string` → 월별 추이 라벨 `N만` (반올림)
   - `formatShortDate('2026-09-14') → '09.14'`, `formatFullDate('2026-10-01') → '2026.10.01'`, `formatMonthTitle('2026-09-14') → '2026년 9월'` — 문자열 slice로만, `Date` 금지
   - `formatBytes(n)` → `KB`/`MB` 표기
7. **`src/app/error.tsx`**(Client Component, 다시 시도 버튼), **`src/app/not-found.tsx`**(대시보드로 돌아가기) — 디자인 톤을 따르는 단순 화면
8. 기존 `src/app/page.tsx`의 빈 랜딩은 `PublicHeader` + 워드마크만 쓰도록 바꿔도 되지만 랜딩 콘텐츠는 만들지 마라
9. **테스트**: Button variant·disabled, IconButton aria-label, Field 에러 연결, FilterChip aria-pressed, `isMocked`, format 함수 전부, DemoBanner 표시 조건

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
   - UI_GUIDE "AI 슬롭 안티패턴"(그림자·그라데이션·카드 radius·이모지)을 위반하지 않았는가? `grep -rn "shadow\|gradient\|backdrop-blur" src/`로 확인
3. 결과에 따라 `phases/0-mvp/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"` (만든 컴포넌트 목록 포함)
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- `_ds_bundle.js`, `tweaks-panel.jsx`, CDN React/Babel을 import·복사하지 마라. 이유: 프로토타입 전용이다. TSX로 다시 만든다.
- shadcn/ui 등 UI 라이브러리를 추가하지 마라. 이유: 디자인 시스템이 단순해 직접 만드는 편이 작다.
- `MOCK_SERVICES`를 클라이언트에서 읽지 마라(`NEXT_PUBLIC_` 접두사 금지). 이유: 서버가 판단해 띠만 렌더한다.
- 화면 단위 컴포넌트(랜딩 섹션, 로그인 폼, 결과 패널)를 만들지 마라. 이유: 각 화면 step의 범위다.
- 기존 테스트를 깨뜨리지 마라
