# UI 디자인 가이드

> 원본 디자인: `docs/design/FinSight.html` (claude.ai/design 프로토타입). 이 문서와 디자인이 다르면 디자인이 우선한다.
> **UI(컴포넌트·페이지·스타일)를 만들거나 고치는 작업이면, 시작 전에 `.claude/skills/finsight-design/SKILL.md`를 반드시 읽고 따른다.** 화면별 구성·컴포넌트 매핑·이식 규칙이 거기 있다.
> 화면 구조(라우트·디렉토리)는 `docs/ARCHITECTURE.md`가 원본이고, 이 문서는 시각 규칙만 다룬다.

## 디자인 원칙
1. 흑백 에디토리얼. 잉크(#111) + 흰색 + 소프트 클라우드(#f5f5f5)가 화면의 95%다. 색은 신호로만 쓴다.
2. 숫자가 주인공이다. 핵심 금액은 Bebas Neue 디스플레이 숫자로 크게, 표의 금액은 오른쪽 정렬 + `tabular-nums`.
3. 장식이 없다. 그림자·그라데이션·둥근 카드·테두리 박스 없이 여백, 1px 헤어라인, 소프트 클라우드 면으로 구획한다.

## AI 슬롭 안티패턴 — 하지 마라
| 금지 사항 | 이유 |
|-----------|------|
| box-shadow 드롭 섀도 (모든 요소) | 디자인 시스템에 그림자가 없다. 구분은 헤어라인·면으로 |
| backdrop-filter: blur() | glass morphism 템플릿 징후 (모달 뒤 40% 잉크 스크림만 허용) |
| gradient, gradient-text, 배경 orb | 디자인에 그라데이션이 없다 |
| 카드·컨테이너에 border-radius | 컨테이너는 직각(0). 둥근 것은 pill CTA·입력·배지·원형 버튼뿐 |
| 보라/인디고/초록 브랜드 색 | 브랜드 색은 잉크(#111)다. Primary CTA는 항상 잉크 |
| "Powered by AI" 배지, ✨ 이모지 | 장식. 이모지·장식 유니코드 금지 (아이콘은 lucide만) |
| 빨강을 지출 증가 표시에 사용 | 빨강(`--sale`)은 이상거래·중복 의심·에러·위험 동작에만 |

## 디자인 토큰
`docs/design/_ds/*/tokens/*.css`의 값을 `src/app/globals.css`에 CSS 변수로 그대로 옮기고, Tailwind `@theme`에 연결해 쓴다. 하드코딩 hex 금지.

### 색상
| 토큰 | 값 | 용도 |
|------|------|------|
| `--ink` | #111111 | 주 텍스트, Primary CTA, 활성 탭 밑줄, 섹션 헤더 밑줄, 막대 |
| `--canvas` | #ffffff | 페이지 배경 |
| `--soft-cloud` | #f5f5f5 | 타일·잠금 카드·빈 상태·드롭존·인증 배경, Secondary CTA |
| `--hairline` | #cacacb | 입력·배지 테두리, 구분선 |
| `--hairline-soft` | #e5e5e5 | 목록 행 구분선, 비활성 버튼 배경, 미터 트랙 |
| `--charcoal` | #39393b | 본문 리드, 링크 hover |
| `--mute` | #707072 | 보조 텍스트 (라벨·캡션·날짜) |
| `--stone` | #9e9ea0 | 비활성 텍스트 |
| `--sale` | #d30005 | 에러·이상거래 플래그·회원 탈퇴 |
| `--success` | #007d48 | 전월 대비 **감소** (증가는 잉크) |
| `--scrim` | rgba(17,17,17,.4) | 모달 배경 |

- 카테고리 막대·비중 스트립: 색상 팔레트 없이 잉크 계조 `ink → charcoal → mute → stone → hairline` 순서. 월별 추이는 이번 달만 잉크, 나머지 hairline.

### 타이포그래피
- 폰트: Inter(라틴·숫자) + Noto Sans KR(한글) 400/500/700, 디스플레이 숫자는 Bebas Neue 400. `next/font/google`로 로드
  - `--font-body/ui/heading: "Inter","Noto Sans KR",sans-serif` · `--font-display: "Bebas Neue","Noto Sans KR",sans-serif`
- 자간 0 (워드마크만 −0.03em). 굵기는 대부분 500(Medium)

| 용도 | 스타일 |
|------|--------|
| 랜딩 히어로 | 700 clamp(40px,5.6vw,76px)/1.08 heading, −0.02em |
| 페이지 제목 (h1) | 500 32px/1.2 (`--type-heading-xl`) |
| 섹션·모달 제목 (h2) | 500 24px/1.2 (`--type-heading-lg`) |
| 본문 | 400 16px/1.5 (`--type-body-md`) |
| 강조 본문·섹션 헤더 | 500 16px/1.5 (`--type-body-strong`) |
| 캡션·표·라벨 | 500 14px/1.5 (`--type-caption-md`), 작은 것 12px (`--type-caption-sm`) |
| KPI 숫자 | 400 32px/1 display, +0.01em |
| 총지출 같은 대형 숫자 | 400 clamp(56px,6vw,88px)/0.9 display |
| 워드마크 | `finsight` 소문자, heading 700, −0.03em (로고 이미지 그리지 말 것) |

### 간격·모서리·모션
- 간격: 8px 기반 `2/4/8/12/18/24/30/48`. 페이지 상단 32px·하단 80px, 결과 섹션 간 32~48px
- 컨테이너: max 1440px, 좌우 gutter 48px(≤1023px 36px, ≤599px 20px). 업로드·설정은 좁은 폭 880px
- 모서리: 컨테이너 0 · 아이콘 컨테이너 18px · 입력 24px · CTA·배지·칩·토스트 30px(pill) · 원형 버튼·스피너 full
- 모션: 버튼 누름 `scale(.5)+opacity .5` 200ms, 막대 너비 300ms, 그 외 150ms standard ease. 스크롤·바운스 애니메이션 금지

## 컴포넌트 요약 (상세는 스킬)
- **Button** — pill(30px), `primary`(잉크/흰 글자) · `secondary`(soft-cloud/잉크) · `on-image`(흰 배경, 잉크 배경 위에서) / 높이 sm 36 · md 48 · lg 64 / disabled는 hairline-soft 배경 + stone 글자
- **IconButton** — 원형 40px(목록 안 36px), `ghost`·`soft`, `aria-label` 필수
- **Badge** — 흰 배경 + 1px hairline + pill, 12px. Pro 배지만 잉크 반전
- **FilterChip** — 높이 40 pill, 활성 시 잉크로 완전 반전
- **Input** — 높이 48, 1px hairline, radius 24, focus 시 2px 잉크 테두리. 에러는 아래 `--sale` 12px 문구
- **섹션 헤더** — 제목(body-strong) + 오른쪽 액션, 아래 1px **잉크** 선
- **목록 행** — 패딩 10~20px, 아래 1px hairline-soft, 금액은 오른쪽
- **Pro 잠금 카드** — soft-cloud 면 + 자물쇠 아이콘 박스 + 제목·(발견 건수 숫자)·설명 한 줄 + "Pro로 업그레이드" sm 버튼. 가짜 데이터를 흐리게 깔지 않는다
- 카드에는 그림자·테두리·radius가 없다. 면(soft-cloud) 또는 여백으로만 구분한다

## 아이콘
- `lucide-react`, size 14~28 (기본 16~20), `currentColor`
- 아이콘만 있는 버튼은 IconButton(원형)으로. 기능 소개·잠금 카드의 아이콘은 18px radius 사각 컨테이너(44px/40px) 안에 둔다
