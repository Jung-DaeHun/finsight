---
name: finsight-design
description: FinSight 화면(랜딩·인증·대시보드·업로드·분석 중·결과·샘플·설정)과 UI 컴포넌트를 구현하거나 수정할 때 반드시 사용. docs/design 프로토타입을 Next.js + Tailwind로 이식하는 화면 구성·컴포넌트 매핑·이식 규칙을 담고 있다. UI·스타일·페이지·컴포넌트 작업이면 트리거.
---

# FinSight 디자인 이식

원본 디자인은 `docs/design/`의 claude.ai/design 프로토타입(React UMD + Babel)이다. 시각 규칙과 토큰은 `docs/UI_GUIDE.md`를 따른다. 이 스킬은 **어떤 화면에 무엇을 어떻게 배치하는지**와 **프로토타입을 실제 코드로 옮기는 규칙**을 다룬다.

## 원본 파일 읽는 법

| 파일 | 내용 | 언제 읽나 |
|------|------|-----------|
| `docs/design/FinSight.html` `<style>` | 모든 `.fs-*` 클래스의 정확한 CSS 값과 반응형 규칙 | 스타일 값이 필요할 때 `grep "\.fs-<이름>"`으로 찾는다 |
| `docs/design/fs-ui.jsx` | 공용 조각: 헤더, SectionHead, KPI, Delta, CategoryBars, ShareStrip, TopMerchants, TxTable, LockCard, 결과 패널 4종 | 결과·대시보드 작업 |
| `docs/design/fs-public.jsx` | 랜딩, AuthShell, Login, Signup, VerifySent, Reset | 랜딩·인증 작업 |
| `docs/design/fs-app.jsx` | Dashboard, Upload, Analyzing, Result(3개 레이아웃), Checkout, Settings | 앱 화면 작업 |
| `docs/design/fs-data.jsx` | 목업 거래·`fsWon`·`fsBuild` | 샘플 데이터 모양 참고용으로만 |
| `docs/design/_ds/*/tokens/*.css` | 디자인 토큰 원본 | `globals.css` 작업 |
| `docs/design/_ds/*/_ds_bundle.js` | DS 컴포넌트(Button 등) 구현 | 컴포넌트 스타일 확인용 (`grep "function Button"`) |

`tweaks-panel.jsx`, `_ds/*/readme.md`(리테일용 일반 설명), `_adherence.oxlintrc.json`, `_ds_manifest.json`은 무시한다.

## 이식 규칙 (반드시)

1. **구조는 ARCHITECTURE, 모양은 디자인.** 라우트·디렉토리·데이터 흐름은 `docs/ARCHITECTURE.md` 5.1을 따른다. 디자인의 화면 전환(`go()`)·상태 관리는 따라 하지 않는다.
2. **가져오지 말 것:** `tweaks-panel.jsx`·`TweaksPanel`, `localStorage` 상태, CDN React/Babel 스크립트, `_ds_bundle.js`, `fs-data.jsx` 목업 데이터, `fsBuild`, `.fs-demo` 데모 버튼, Checkout 화면(실제 결제는 Polar 호스팅 페이지).
   - 이유: 프로토타입 전용 장치다. 숫자 계산은 `lib/analysis`의 결정론적 코드에서, 샘플 데이터는 `src/sample/analysis.json`에서 온다.
3. **DS 컴포넌트는 `src/components/ui/`에 TSX로 다시 만든다.** Button·IconButton·Badge·FilterChip·Input(Field)·Icon(lucide-react 래퍼)의 크기·variant는 UI_GUIDE "컴포넌트 요약"과 `_ds_bundle.js`를 따른다. 인라인 style이 아니라 Tailwind 클래스와 CSS 변수를 쓴다.
4. **문구는 디자인의 한국어를 그대로 쓴다.** 에러 문구(`FS_ERR` 등)는 `src/messages/errors.ts`의 해당 에러 코드에 옮긴다.
5. **금액 표기:** `₩` + `toLocaleString('ko-KR')` (`fsWon`과 같은 결과). `lib/`의 순수 함수 하나로 만들고 테스트한다. 월별 추이 라벨은 `N만`.
6. **날짜 표기:** `YYYY-MM-DD` 문자열에서 잘라 `09.14`·`2026.10.01`로 만든다. `Date`로 변환하지 않는다.
7. **가맹점명·AI 인사이트는 텍스트로만** 렌더한다. `dangerouslySetInnerHTML`·마크다운 렌더러 금지.
8. **Pro 잠금은 `toAnalysisView` 결과만 보고 판단한다.** 잠긴 패널에는 발견 건수(teaser)만 받고 상세 필드는 클라이언트에 오지 않게 한다.
9. **차트:** 카테고리 막대·비중 스트립·월별 추이 막대는 디자인처럼 단순 `div` 막대로 그린다(잉크 계조). 축·범례·툴팁 없음. 비중 스트립의 세그먼트에는 `title`로 "카테고리 비율%"을 넣는다.
10. **반응형:** 브레이크포인트 1100 / 860 / 600px. 360~375px 폭에서 가로 스크롤이 없어야 한다(표는 `overflow-x:auto` 래퍼, 좁은 화면에서 카테고리·출처 열 숨김 `fs-hide-sm`).

## 공통 레이아웃

- **PublicHeader** (랜딩·샘플 비로그인): 3열 그리드 — 왼쪽 워드마크, 가운데 `기능 / 요금제 / 샘플 결과` 링크, 오른쪽 `로그인`(텍스트 버튼) + `무료로 시작하기`(sm). 로그인 상태면 오른쪽에 `대시보드`(sm)만. 높이 60, sticky, 하단 `inset 0 -1px 0 hairline-soft`. 860px 이하에서 가운데 링크 숨김
- **AppHeader** (로그인 후): 워드마크 / 탭 `대시보드 · 새 분석 · 설정`(활성 탭은 하단 2px 잉크, 결과 화면에서는 `대시보드` 활성) / 오른쪽 플랜 Badge(Pro는 잉크 반전) + 이메일(좁은 화면 숨김) + `로그아웃`. 600px 이하에서 탭이 두 번째 줄로 내려감
- **PageTitle**: 왼쪽 h1(32px) + 보조 문구, 오른쪽 액션. 아래 여백 32px
- **SectionHead**: 제목 + `(개수)` mute + 오른쪽 액션, 아래 1px 잉크 선
- **Toast**: 하단 중앙, 잉크 배경 pill, 2.6초

## 화면별 구성

### 랜딩 `app/page.tsx` (`Landing`)
1. **히어로** (2열, 860px 이하 1열): 왼쪽 `명세서를 올리면 / 지출이 정리됩니다` + 리드 문단 + [무료로 시작하기][샘플 결과 보기(secondary)](600px 이하 세로 전체 폭) + 상단 hairline 아래 check 아이콘 신뢰 정보 3줄(`파일 보관 안내` 목록, 확인된 사실만). 오른쪽 soft-cloud 판 위 흰 카드: 캡션 기간·출처 + `샘플` Badge → `총지출` 라벨 + 대형 총지출 → 비중 스트립 → 상위 4개 카테고리 2×2(스트립과 같은 계조의 8px 범례 사각형) → 상단 hairline + `repeat` 아이콘 "정기결제 N건 · 이상거래 N건 발견". 숫자는 샘플 데이터에서 가져온다
2. **기능** `형식은 신경 쓰지 마세요`: soft-cloud 타일 4개(auto-fit, min 220, gap 8) — 아이콘 박스 + 제목 + 설명. (file-spreadsheet / pie-chart / repeat / layers)
3. **이용 방법**: 3단계, 각 항목 위 2px 잉크 선 + 디스플레이 숫자
4. **요금제** `#pricing`: Free(soft-cloud, $0, on-image 버튼) / Pro(잉크 반전, $20 / 월, on-image 버튼) 2열 + 비교표 7행(`포함`은 check 아이콘 + sr-only 글자, 미포함은 `—` + sr-only `미포함`, 모바일에서도 가로 스크롤 없이 table-fixed) + 하단 캡션(월 분석 횟수 기준·KRW 전용). Pro 버튼: 비로그인 `Pro 시작하기`→가입, 로그인 Free `Pro로 업그레이드`→`/api/checkout`, Pro는 버튼 대신 `이용 중인 플랜입니다`
5. **CTA 밴드**: 잉크 배경 전체 폭, `이번 달 지출부터 정리하세요` + on-image 버튼
6. **푸터**: 워드마크 18 / 이용약관·개인정보처리방침·문의 / © 2026 finsight

### 인증 `login/ signup/ reset-password/` (`AuthShell`)
- soft-cloud 전체 배경, 상단 80px 워드마크, 가운데 흰 카드(max 420, padding 36, gap 16)
- **로그인**: h2 → `Google로 계속하기`(흰 pill, hairline 테두리, 높이 48) → `또는 이메일` 구분선 → 이메일·비밀번호 Field → 오른쪽 정렬 `비밀번호를 잊으셨나요?` → 로그인(fullWidth) → `계정이 없으신가요? 회원가입`
- **회원가입**: 같은 구성 + 비밀번호 hint `8자 이상` + soft-cloud 동의 박스(필수 체크박스 2개: 이용약관·개인정보 수집, 국외 이전 — Anthropic·Polar·Vercel(미국) 설명). Google 가입도 동의 필수
- **인증 메일 발송**: mail 아이콘 박스 → `메일함을 확인해 주세요` → 이메일 굵게 포함 설명 → `인증 메일 다시 보내기`(secondary)
- **비밀번호 재설정**: 이메일 입력 → `링크 보내기`(형식 유효할 때만 활성) → 발송 후 안내 + `로그인으로 돌아가기`
- 검증 문구: `이메일 형식을 확인해 주세요.` / `비밀번호는 8자 이상입니다.` / `필수 항목에 동의해 주세요.`

### 대시보드 `dashboard/page.tsx` (`Dashboard` + `Upload`)
- ARCHITECTURE상 업로드는 대시보드 페이지 안에 있다. 헤더의 `새 분석` 탭과 `새 분석` 버튼은 대시보드의 업로드 영역으로 이동시킨다
- 결제 대기(`?checkout=success`, 아직 웹훅 전): 상단 soft-cloud 배너 — 스피너 + `결제 확인 중` + 설명
- PageTitle `대시보드`, 오른쪽 **사용량 미터**(`이번 달 분석` · `N / 5회` · 72×4px 막대) + `새 분석`(plus 아이콘)
- **빈 상태**: soft-cloud 낮은 가로 블록(py 32) — 왼쪽 `첫 명세서를 올려 보세요` + 설명, 오른쪽 [파일 올리기][샘플 결과 보기(on-image)]. 아래 드롭존까지 1280×720 첫 화면에 보여야 한다. 빈 상태에서는 PageTitle의 `새 분석`을 숨긴다(같은 목적지 primary 중복 방지)
- **내 분석 (N)**: 행 버튼 목록 — 제목·파일명들(` · ` 구분) / 생성일(좁은 화면 숨김) / 총지출 / chevron-right. 행 구분 hairline-soft
- Free면 목록 아래 LockCard `카드·계좌 여러 개를 한 번에`
- **업로드 영역** (좁은 폭 880): 부제 `파일 1개 · Pro는 최대 3개` / Pro `파일 최대 3개 · 여러 카드·계좌를 합쳐 분석`
  - 드롭존: dashed stone 테두리 + soft-cloud, upload 아이콘 28 + `파일을 끌어다 놓거나 클릭해서 선택` + 형식 캡션. 드래그 중에는 2px 잉크 실선
  - 에러 메시지 박스: 1px sale 테두리 + alert-circle + 파일명 + 문구 (+ Free 파일 개수 초과 시 `Pro로 업그레이드`)
  - 파일 목록: file-spreadsheet + 이름 · 크기(KB/MB) + 제거 IconButton(ghost, 36)
  - 하단: 상단 hairline + 왼쪽 lock 아이콘 저장 안내 캡션 + 오른쪽 `분석 시작` / 여러 개면 `분석 시작 (N개 파일)` / 한도 초과 시 비활성 `이번 달 분석 횟수를 모두 사용했습니다`

### 분석 중 (`Analyzing`)
- 가운데 정렬, 상단 96px: 큰 스피너(40) → `명세서를 분석하고 있습니다` → 파일명 → 단계 목록 5개(`파일 읽는 중` → `열 구조 파악 (날짜 · 금액 · 가맹점)` → `거래 분류 중` → `정기결제 · 이상거래 탐지` → `요약 만드는 중`) → `창을 닫지 마세요…` 캡션
- 단계 점: 완료는 체크, 현재는 2px 잉크 테두리, 대기는 stone 글자. 서버가 진행 이벤트를 주지 않으면 시간 기반으로 넘기되 마지막 단계에서 응답을 기다린다

### 결과 `dashboard/analyses/[id]/page.tsx` (`Result` + **`LayoutGrid`**)
레이아웃은 디자인 기본값인 **grid**를 쓴다. (`report`·`split`은 프로토타입 비교안이므로 구현하지 않는다.)
- **헤더**: 브레드크럼 `대시보드 / 2026년 9월` → h1 `{제목} 지출` + 파일 Badge들(file-spreadsheet 12) / 오른쪽 `{생성일} 분석 · 거래 N건`
- **4열 그리드** (gap 32×24, 1100px 이하 2열, 섹션은 전체 폭):
  1. KPI 타일 4개(soft-cloud, padding 20, 숫자 30px): 총지출(+Pro는 Delta, Free는 건수) / 일평균 / 정기결제 N건(Pro `월 ₩…`, Free `상세는 Pro`) / 이상거래 N건
  2. `카테고리별 지출`(2칸): 비중 스트립 + 카테고리 막대 / `상위 가맹점`(2칸): 순위 목록 5개
  3. `월별 추이`(2칸) / `AI 인사이트`(2칸) — Free는 각각 LockCard
  4. Pro만: `정기결제`(2칸) / `이상거래`(2칸)
  5. `거래 내역`(전체): 10행 + `전체 보기 (N)`
- **카테고리 막대** 행: `라벨 96 | 트랙 | 금액 96 | 비율 48` 그리드. 누르면 해당 카테고리로 거래 내역 필터(다른 행 opacity .35, 선택 행 라벨 700), 섹션 헤더 오른쪽 `필터 해제`
- **Delta**: `전월 대비 +N.N%` — 감소면 success, 증가면 잉크. 전월 없으면 `전월 데이터 없음`
- **거래 표**: 가맹점 검색 Input(sm, max 260) + `N건 · ₩합계` / 열 `날짜 · 가맹점(+설명 캡션, 중복 의심 플래그 sale) · 카테고리 · 출처(파일 2개 이상일 때) · 금액(오른쪽)` / 날짜 내림차순 / 헤더 아래 1px 잉크
- **정기결제**: `N건 · 월 ₩합계` + 행(가맹점 / `N개월 연속 · 다음 결제 10.01` / 금액)
- **이상거래**: 행(유형 Badge `중복 결제`·`급증` / 제목 굵게 / 설명)
- **월별 추이**: 높이 180 세로 막대 6개월(이번 달 잉크, 나머지 hairline, 위에 `N만` 라벨) + `카테고리 변화 (8월 → 9월)` 4행
- **AI 인사이트** 상태: idle(soft-cloud + `인사이트 생성` 버튼) → loading(스피너 + `거래 N건을 살펴보는 중…`) → done(`예상 절약 가능액` + `월 ₩…` + 번호 목록 제목·설명)
- **LockCard 문구**: 정기결제 `N건 발견` / 이상거래 `N건 발견` / 월별 추이 · 전월 대비 / AI 인사이트 & 절약 조언 — 설명은 `fs-ui.jsx` 그대로

### 샘플 결과
- 결과 화면과 같은 구성(Pro 기능 모두 표시). 맨 위 잉크 바: `샘플 결과 · 실제 명세서 예시로 만든 결과입니다. Pro 기능까지 모두 보여드립니다.` + `무료로 시작하기`(on-image, sm). 브레드크럼은 `홈 / …`

### 설정 `settings/page.tsx` (`Settings`, 좁은 폭)
- **구독**: Pro면 `Pro · $20/월 · 다음 결제일 …` + `구독 관리`(secondary, external-link, Polar 고객 포털), Free면 `Free · 이번 달 분석 N/5회 사용` + `Pro로 업그레이드`
- **분석 기록 (N)**: 삭제 안내 캡션 + 행(제목 / 파일 · 생성일 / trash-2 IconButton). 누르면 그 자리에서 `취소` + `삭제` 인라인 확인
- **계정**: 이메일 + `회원 탈퇴`(sale 텍스트 버튼)
- **탈퇴 모달**: 스크림 + 흰 박스(max 440): 처리 순서 3단계(`Polar 구독 취소` → `원본 파일 삭제` → `계정 · 분석 데이터 삭제`) + `'탈퇴'를 입력하세요` Field(정확히 `탈퇴`일 때만 활성) + [취소][탈퇴하기]. 진행 중에는 단계 목록이 체크로 바뀌고 바깥 클릭으로 닫히지 않음

## 검증
- 새 UI 컴포넌트는 Testing Library로 문구·상태(잠금/해제, 비활성 조건, 필터)를 먼저 테스트한다 (TDD)
- 시각 확인이 가능하면 `npm run dev`로 띄워 `docs/design/FinSight.html`과 나란히 비교한다
