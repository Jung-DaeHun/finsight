# 브라우저 테스트 시나리오

> 브라우저로 주요 사용자 흐름을 확인할 때 이 문서를 기준으로 한다. 시나리오 번호(S1~S7)는 이 문서 고유 번호이고, 괄호 안 번호(1.5, 3.4 등)는 `docs/USER_FLOW.md`의 시나리오 번호다.
> 마지막 전체 실행: 2026-10-03 (결과는 6절). 같은 날 BUG-1(결제 API prefetch)과 BUG-2(정기결제 월 금액)를 수정하고 회귀를 확인했다.

## 1. 실행 원칙

- **프로덕션 빌드로 테스트한다** (`npm run build && npm start`). `next dev`는 `Link`의 viewport prefetch를 하지 않아 prefetch 부작용이 드러나지 않는다. 결제 API가 페이지를 보기만 해도 실행되던 버그도 dev에서는 재현되지 않았다. 또 로컬 dev 서버에서는 `/dashboard/analyses/[id]`가 500(`Jest worker encountered 2 child process exceptions`)을 낸 적이 있다(ENV-1).
- 환경은 `.env.local` 그대로 쓴다: 개발 Supabase + `MOCK_SERVICES=claude,polar`. 운영 Supabase에는 연결하지 않는다.
- **포트는 3000 하나만 쓴다.** `NEXT_PUBLIC_APP_URL=http://localhost:3000`이라 다른 포트로 띄우면 mock 결제 성공 리다이렉트가 3000으로 가서 cross-origin이 된다. 쿠키는 포트와 무관하게 `localhost`에서 공유된다.
- 금액·건수는 앱 화면끼리 비교하지 않는다. 아래 픽스처를 손으로 계산한 기대값과 대조한다. 카테고리 기대값은 mock 분류 규칙(`src/services/claude-mock.ts`) 기준이다.
- 실행 순서: S1 → S2 → S3 → S4 → S5 → S7 → S6. S3~S6은 테스트 계정 하나로 이어서 진행하고, 마지막 S6의 탈퇴가 정리 단계를 겸한다.
- 각 단계에서 `pageerror`와 콘솔 에러를 수집한다. 예상된 에러는 시나리오에 따로 적어 둔다.

## 2. 준비

### 2.1 테스트 계정

이메일 가입은 실제 SMTP 인증 링크가 필요하므로, 테스트 계정은 admin API로 **이메일 인증이 끝난 상태**로 만든다. 프로젝트 루트에서 실행한다.

```bash
node --env-file=.env.local -e '
const { createClient } = require("@supabase/supabase-js");
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
admin.auth.admin.createUser({ email: `finsight-e2e-${Date.now()}@example.com`, password: process.argv[1], email_confirm: true })
  .then(({ data, error }) => console.log(error ? error.message : `${data.user.email} ${data.user.id}`));' '<임의 비밀번호>'
```

이메일, 비밀번호, user id는 정리 확인(5절)에 필요하니 기록해 둔다.

### 2.2 픽스처

`~/.dev-browser/tmp/`에 저장한다(dev-browser의 `readFile`로 읽을 수 있는 위치). 모두 UTF-8이다.

**fx-card-a-2026-09.csv**: S3, S4(중복), S5. 제목 행이 있고 기간이 월을 걸친다(3.2).
```csv
신한카드 이용대금명세서 2026년 9월
이용일,가맹점명,이용금액
2026-08-28,넷플릭스,17000
2026-09-01,스타벅스 강남점,5800
2026-09-03,이마트 성수점,64200
2026-09-05,배달의민족,23500
2026-09-05,배달의민족,23500
2026-09-08,카카오모빌리티,12400
2026-09-12,CGV 용산,15000
2026-09-15,스타벅스 강남점,6300
2026-09-18,온누리약국,8700
2026-09-22,교보문고,22000
2026-09-26,넷플릭스,17000
```

**fx-card-a-2026-10.csv**: S5(Pro, 계좌와 함께). 스타벅스 62,000은 급증 탐지용이다.
```csv
신한카드 이용대금명세서 2026년 10월
이용일,가맹점명,이용금액
2026-10-01,스타벅스 강남점,62000
2026-10-04,이마트 성수점,41900
2026-10-09,배달의민족,31000
2026-10-15,유튜브 프리미엄,14900
2026-10-26,넷플릭스,17000
```

**fx-bank-2026-10.csv**: S5. 출금·입금 분리 열이고, 급여(income)와 카드대금(transfer)은 지출에서 빠져야 한다(3.1).
```csv
거래일자,적요,출금액,입금액,잔액
2026-10-01,월세,700000,,2300000
2026-10-10,급여,,3200000,5500000
2026-10-14,카드대금,215400,,5284600
2026-10-20,GS25 편의점,4800,,5279800
```

**fx-not-transactions.csv**: S4
```csv
이름,부서,연락처
홍길동,영업팀,010-0000-0000
김철수,개발팀,010-1111-1111
```

**fx-foreign-only.csv**: S4
```csv
이용일,가맹점명,USD금액
2026-09-03,AMAZON.COM,25.00
2026-09-10,APPLE.COM/BILL,9.99
```

`.txt` 파일과 1MB 초과 파일은 브라우저 안에서 바로 만들어 쓴다(2.3).

### 2.3 dev-browser 사용 팁

- 업로드 input은 숨겨져 있다. `DataTransfer`로 파일을 넣고 `change` 이벤트를 발생시킨다.
  ```js
  await page.evaluate((files) => {
    const input = document.querySelector('input[type="file"]');
    const dt = new DataTransfer();
    for (const f of files) dt.items.add(new File([f.content ?? "x".repeat(f.size)], f.name, { type: f.type }));
    input.files = dt.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, [{ name: "card-a-2026-09.csv", type: "text/csv", content: await readFile("fx-card-a-2026-09.csv") }]);
  // 1MB 초과: { name: "big.csv", type: "text/csv", size: 1024 * 1024 + 10 }
  ```
- 결제 API 호출은 요청을 수집해서 확인한다. 페이지를 보는 동안에는 0건, 클릭하면 `document` 타입 GET 1건이어야 한다.
  ```js
  const apiReqs = [];
  page.on("request", (r) => { if (/\/api\/(checkout|portal)/.test(r.url())) apiReqs.push(`${r.method()} ${r.url()} ${r.resourceType()}`); });
  ```
- `waitUntil: "networkidle"`이 끝나지 않는 경우가 있다. `"load"`로 이동한 뒤 `main`이나 대상 요소가 나타날 때까지 기다린다.
- 결과 페이지의 섹션 텍스트는 `heading` → `ancestor::section[1]`으로 가져오면 비교하기 편하다.

## 3. 시나리오 요약

| # | 시나리오 | 상태 | USER_FLOW |
|---|---|---|---|
| S1 | 방문자 탐색 → 가입 시도 | 로그아웃 | J1, 1.5 |
| S2 | 로그인 경계 | 로그아웃 → 로그인 | 1.4, 1.5 |
| S3 | Free 첫 분석 | Free | J2, J3, 3.2, 3.4 |
| S4 | 업로드 실패 경로 | Free | J2 에러 분기 |
| S5 | Pro 업그레이드 → 월간 재방문 | Free → Pro | J4, J5, 3.1 |
| S7 | 모바일 레이아웃 | Pro | 3.3 |
| S6 | 데이터·계정 관리 | Pro → 탈퇴 | J7, 2.5, 5.3, 6.2 |

## 4. 시나리오 상세

### S1. 방문자 탐색 → 가입 시도 (로그아웃)

| 단계 | 기대 결과 |
|---|---|
| `/` 접속 | 헤더 링크: 기능 · 요금제 · 샘플 결과 · 로그인 · 무료로 시작하기. 콘솔 에러 없음 |
| 히어로의 "샘플 결과 보기" 클릭 | `/sample`. 섹션: 2026년 9월 지출, 카테고리별 지출, 상위 가맹점, 월별 추이, AI 인사이트, 정기결제, 이상거래, 거래 내역. 총지출 ₩1,487,900 |
| `/dashboard/analyses/abc` 직접 접근 | `/login`으로 이동 (1.5) |
| `/signup`에서 필수 동의 0개 또는 1개 체크 | "가입하기"·"Google로 계속하기" 비활성 |
| 동의 2개를 모두 체크 | 두 버튼 모두 활성 |
| 이메일 `not-an-email`, 비밀번호 `short`로 제출 | 인라인 에러 "이메일 형식을 확인해 주세요." / "비밀번호는 8자 이상입니다." |
| **이미 있는 테스트 계정 이메일**로 제출 | "메일함을 확인해 주세요" 화면. 가입 여부와 무관하게 같은 응답이 나와야 한다 |

> 새 이메일로는 제출하지 않는다. 실제 SMTP 메일이 발송되고 미인증 계정이 남는다.

### S2. 로그인 경계

| 단계 | 기대 결과 |
|---|---|
| `/login`에서 틀린 비밀번호로 로그인 | `/login`에 머물고 alert "이메일 또는 비밀번호를 확인해 주세요.". Supabase token 400 콘솔 에러는 정상 |
| 올바른 비밀번호로 로그인 | `/dashboard` |
| 로그인 상태로 `/login`, `/signup` 접근 | 둘 다 `/dashboard`로 이동 (1.4) |
| 로그인 상태로 `/` 접속 | 헤더 CTA가 "대시보드" |
| 빈 대시보드 확인 | "첫 명세서를 올려 보세요", "이번 달 분석 0 / 5회", 헤더 Free, "분석 시작" 비활성, 부제 "파일 1개 · Pro는 최대 3개" |

### S3. Free 첫 분석

`fx-card-a-2026-09.csv`를 올리고 "분석 시작"을 누른다. 결과 URL(`/dashboard/analyses/{id}`)은 S5·S6에서 다시 쓴다.

| 항목 | 기대값 |
|---|---|
| 제목 · 거래 수 | 2026년 9월 지출 · 거래 11건 |
| 총지출 | **₩215,400** |
| 일평균 | ₩7,180 (215,400 ÷ 30일, 08-28~09-26) |
| 정기결제 / 이상거래 KPI | 2건 "상세는 Pro" / 2건 "상세는 Pro" (3.4) |
| 카테고리 | 생활·마트 ₩64,200 29.8% · 식비 ₩47,000 21.8% · 구독·디지털 ₩34,000 15.8% · 교육 ₩22,000 10.2% · 문화·여가 ₩15,000 7.0% · 교통 ₩12,400 5.8% · 카페·간식 ₩12,100 5.6% · 의료 ₩8,700 4.0% |
| 상위 가맹점 | 이마트 성수점 ₩64,200 · 배달의민족 ₩47,000 · 넷플릭스 ₩34,000 · 교보문고 ₩22,000 · CGV 용산 ₩15,000 |
| 잠금 카드 | 월별 추이, AI 인사이트, 정기결제 "2건 발견", 이상거래 "2건 발견". 각각 "Pro로 업그레이드" 버튼 |
| 거래 내역 | "11건 · ₩215,400", 첫 10건 표시 후 "전체 보기 (11)" |
| 대시보드 목록 | "2026년 9월 · card-a-2026-09.csv · ₩215,400", "1 / 5회" |
| **회귀: 결제 API prefetch** | 결과 페이지·대시보드·설정을 각각 몇 초씩 열어 둔 뒤에도 헤더가 **Free**이고, `/api/checkout`·`/api/portal` 요청이 0건이어야 한다 |

### S4. 업로드 실패 경로 (Free, S3 이후)

| 입력 | 검증 위치 | 기대 메시지 |
|---|---|---|
| `memo.txt` | 클라이언트 | memo.txt / "CSV, xlsx, xls 파일만 올릴 수 있습니다." |
| 1MB 초과 `big.csv` | 클라이언트 | big.csv / "1MB를 넘는 파일입니다. 기간을 나눠 다시 내려받아 주세요." |
| CSV 2개를 한 번에 선택 | 클라이언트 | b.csv / "분석당 파일 수를 초과했습니다. Free는 1개, Pro는 최대 3개까지 올릴 수 있습니다." + "Pro로 업그레이드" 버튼 |
| S3 파일을 다른 이름으로 다시 업로드 | 서버 | "같은 내용의 파일을 이미 분석했습니다. 기존 분석은 대시보드에서 볼 수 있습니다." (실패 기록이 남지 않음) |
| `fx-not-transactions.csv` | 서버 | not-transactions.csv / "거래내역을 찾을 수 없습니다. 카드 명세서나 은행 거래내역 파일을 올려 주세요." |
| `fx-foreign-only.csv` | 서버 | foreign-only.csv / "원화(KRW) 금액 열이 없는 외화 명세서는 분석할 수 없습니다. 원화 환산 금액이 포함된 명세서를 받아 주세요." |

이후 대시보드: 사용량은 **1 / 5회 그대로**(실패는 차감하지 않음), "내 분석 (3)"에 "분석 실패" 2건이 사유와 함께 표시된다. 문구는 `src/messages/errors.ts`와 일치해야 한다.

### S5. Pro 업그레이드 → 월간 재방문

| 단계 | 기대 결과 |
|---|---|
| S3 결과 페이지의 잠금 카드에서 "Pro로 업그레이드" 클릭 | `GET /api/checkout`(document) **1건**만 발생하고 `/dashboard?checkout=success`로 이동, 헤더가 Pro. 화면에 `already_pro` JSON이 보이면 안 된다 |
| S3 결과 페이지 다시 열기 | 정기결제 목록: 넷플릭스 · 최근 결제 09.26 · ₩17,000. KPI와 패널 요약 모두 **"월 ₩17,000"**. 8월·9월 결제를 합친 ₩34,000이 나오면 안 된다 |
| 〃 | 이상거래: 중복 결제 · 배달의민족 · 09.05 · ₩23,500 × 2 |
| 〃 | 월별 추이: 8월 2만 · 9월 20만 (거래일 기준 월, 3.2) |
| "인사이트 생성" 클릭 | "거래 11건을 살펴보는 중…" → 예상 절약 가능액 **월 ₩17,232**, 3개 항목(첫 항목 "총지출은 215,400원입니다…"). 새로고침 후에도 유지 |
| 대시보드 | 부제 "파일 최대 3개 · 여러 카드·계좌를 합쳐 분석", 사용량 "/ 50회" |
| `fx-card-a-2026-10.csv` + `fx-bank-2026-10.csv`를 함께 선택 | 버튼 "분석 시작 (2개 파일)" |

10월 결과 기대값:

| 항목 | 기대값 |
|---|---|
| 제목 · 거래 수 | 2026년 10월 지출 · 거래 9건 |
| 총지출 | **₩871,600** (카드 166,800 + 월세 700,000 + 편의점 4,800. 급여·카드대금 제외, 3.1) |
| 전월 대비 | **+339.3%** (9월 198,400 → 10월 871,600) |
| 일평균 | ₩33,523 (871,600 ÷ 26일) |
| 정기결제 | 1건 · 월 ₩17,000 · 넷플릭스 최근 결제 10.26 |
| 이상거래 | 급증 · 스타벅스 강남점 · 10.01 · ₩62,000 (이전 평균 6,050원의 3배 이상, 5만 원 이상) |
| 카테고리 | 주거 ₩700,000 80.3% · 카페·간식 ₩62,000 7.1% · 생활·마트 ₩46,700 5.4% · 구독·디지털 ₩31,900 3.7% · 식비 ₩31,000 3.6% |
| 상위 가맹점 | 월세 ₩700,000 · 스타벅스 강남점 ₩62,000 · 이마트 성수점 ₩41,900 · 배달의민족 ₩31,000 · 넷플릭스 ₩17,000 |
| 월별 추이 | 8월 2만 · 9월 20만 · 10월 87만 |
| 거래 내역 | 카드대금 "이체", 급여 "수입" 카테고리로 표시 (목록 합계는 UX-1 참고) |

### S7. 모바일 레이아웃 (375×812)

| 단계 | 기대 결과 |
|---|---|
| `/`, `/sample`, `/dashboard`, 10월 결과, `/settings`, `/login` | 모두 `document.documentElement.scrollWidth === 375` (페이지 가로 스크롤 없음). 랜딩의 요금 비교 표(`min-w-[560px]`)는 컨테이너 안에서만 스크롤되며 의도된 동작 |
| 10월 결과 | KPI 2열, 카테고리 막대 1열, 추이 차트 정상, 거래 목록은 날짜·가맹점·금액 3열(카테고리 열 숨김) |

### S6. 데이터·계정 관리 (마지막에 실행)

| 단계 | 기대 결과 |
|---|---|
| `/settings` | 구독 "Pro · $9/월" + "구독 관리", "분석 기록 (4)" (6.2). 보는 동안 `/api/portal` 요청 0건 |
| "구독 관리" 클릭 | `GET /api/portal`(document) 1건, mock에서는 `/settings`로 돌아옴 |
| "2026년 9월 삭제" 클릭 | 그 행 안에 "취소" / "삭제" 버튼이 나타남 (브라우저 confirm 아님) |
| "삭제" 클릭 | `DELETE /api/analyses/{id}` 204, "분석을 삭제했습니다.", "분석 기록 (3)" |
| 삭제한 분석 URL 접근 | 404 "페이지를 찾을 수 없습니다" |
| 10월 결과 다시 열기 | 전월 대비 "전월 데이터 없음", 추이는 10월 87만만 표시하고 "다음 달 명세서를 올리면 추이가 보여요" (5.3). 총지출 등 나머지 값은 그대로 |
| 대시보드 | 사용량 **2 / 50회 유지** (2.5) |
| "회원 탈퇴" 클릭 | 다이얼로그: Polar 구독 취소 → 원본 파일 삭제 → 계정·분석 데이터 삭제. '탈퇴'를 입력하기 전에는 "탈퇴하기" 비활성 |
| '탈퇴' 입력 → "탈퇴하기" | `/api/account` 204 → `/`, 헤더가 로그아웃 상태. `/dashboard` 접근 시 `/login` |

## 5. 정리 확인

S6 이후 admin API로 확인한다. 모두 0이어야 한다.

```bash
node --env-file=.env.local -e '
const { createClient } = require("@supabase/supabase-js");
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const id = process.argv[1];
(async () => {
  const u = await admin.auth.admin.getUserById(id);
  console.log("auth user:", u.error ? "gone" : "EXISTS");
  const s = await admin.storage.from("csv-uploads").list(id);
  console.log("storage:", s.error ? s.error.message : s.data.length);
  for (const t of ["subscriptions", "analyses", "uploads", "transactions", "analysis_usage"]) {
    const { count } = await admin.from(t).select("*", { count: "exact", head: true }).eq("user_id", id);
    console.log(t, count);
  }
})();' '<user id>'
```

S6까지 가지 못하고 중단했다면 `admin.auth.admin.deleteUser(id)`로 계정을 지운다. DB row는 cascade로 함께 지워진다. 다만 Storage 객체는 cascade 대상이 아니므로 `csv-uploads/{id}/` 아래를 직접 지운다.

## 6. 알려진 이슈 (2026-10-03 실행 기준)

수정되면 해당 행을 지우고, 시나리오의 회귀 항목으로 확인한다.

| ID | 심각도 | 내용 | 위치 | 수정 후 기대 |
|---|---|---|---|---|
| UX-1 | 낮음 | 거래 내역 합계가 수입·이체까지 부호를 붙여 더해 "9건 · -₩2,113,000"으로 나온다(총지출 ₩871,600과 다름). 급여는 "-₩3,200,000"으로 표시된다. 스펙에 정의 없음 | `TransactionPanel.tsx:25, 49` | 표시 기준을 스펙으로 정한 뒤 반영 |
| A11Y-1 | 낮음 | 설정의 실패 분석 삭제 버튼 접근성 이름이 모두 "분석 실패 삭제"라 구분되지 않는다 | `settings/Settings.tsx` | 파일명 등 구분 정보 포함 |
| COPY-1 | 낮음 | 인증 메일 안내 "…@example.com로": 조사 처리 | `VerifySent.tsx` | "(으)로" 등 |
| DOC-1 | 낮음 | USER_FLOW의 "카드사별 파일 받는 법 안내"(J2)와 "모바일 거래 목록 카드형"(3.3)이 구현·UI_GUIDE에 없다 | `docs/USER_FLOW.md` | 문서 또는 구현 중 하나로 맞춤 |
| ENV-1 | 환경 | 로컬 `next dev`에서 동적 라우트 `/dashboard/analyses/[id]`가 500(`Jest worker encountered 2 child process exceptions`)을 냈고, 이후 서버 stdout에 `EPIPE`가 반복됐다. 프로덕션 빌드에서는 정상이다. 원인은 확인하지 못했다 | `.next/dev/logs/next-development.log` | dev 서버를 재시작했을 때 재현되는지 확인 |
