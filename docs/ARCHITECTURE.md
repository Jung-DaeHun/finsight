# 아키텍처

## 디렉토리 구조
```
src/
├── app/
│   ├── [locale]/                  # next-intl 로케일 세그먼트 (ko | en)
│   │   ├── page.tsx               # 랜딩
│   │   ├── login/ signup/         # 인증 화면
│   │   ├── dashboard/
│   │   │   ├── page.tsx           # 업로드 + 최근 분석
│   │   │   └── analyses/[id]/     # 분석 결과 상세
│   │   └── settings/              # 언어, 데이터 삭제, 구독 관리
│   ├── auth/callback/route.ts     # Supabase OAuth/이메일 인증 콜백
│   └── api/
│       ├── analyses/route.ts          # POST: 업로드 + 분석 시작
│       ├── analyses/[id]/route.ts     # GET: 상태/결과, DELETE: 삭제
│       ├── account/route.ts           # DELETE: 내 데이터 전체 삭제
│       ├── checkout/route.ts          # Polar Checkout 세션 생성
│       ├── portal/route.ts            # Polar 고객 포털 리다이렉트
│       └── webhooks/polar/route.ts    # Polar 웹훅 (구독 상태 동기화)
├── components/
│   ├── ui/                        # 버튼, 카드, 입력 등 기본 요소
│   ├── landing/                   # 랜딩 섹션
│   └── dashboard/                 # 차트, 업로드 폼, Pro 잠금 카드
├── lib/
│   ├── supabase/                  # server/browser/admin 클라이언트 생성
│   ├── csv/                       # 인코딩 감지, 파싱, 정규화 (순수 함수)
│   ├── analysis/                  # 집계, 정기결제·이상거래 탐지 (순수 함수)
│   ├── plan.ts                    # 플랜별 권한·한도 판단 (순수 함수)
│   └── i18n/                      # next-intl 설정
├── services/
│   ├── claude.ts                  # Claude API 래퍼 (컬럼 매핑, 분류, 인사이트)
│   ├── polar.ts                   # Polar SDK 래퍼
│   └── analysis-pipeline.ts       # 업로드 → 매핑 → 정규화 → 분류 → 탐지 → 저장 오케스트레이션
├── messages/                      # ko.json, en.json
├── types/                         # 도메인 타입 (Transaction, Analysis, Plan ...)
└── proxy.ts                       # 세션 갱신 + 로케일 라우팅 + /dashboard 보호
supabase/
└── migrations/                    # 스키마 + RLS 정책 SQL
```

## 패턴
- **Server Components 기본.** 업로드 폼, 차트, 폴링 등 인터랙션이 필요한 곳만 Client Component.
- **외부 API는 `services/`에서만 호출.** Claude, Polar SDK를 컴포넌트나 `lib/`에서 직접 import하지 않는다.
- **순수 로직은 `lib/`에 분리.** CSV 정규화, 집계, 탐지, 플랜 판단은 I/O 없는 순수 함수로 작성해 단위 테스트한다.
- **LLM은 판단이 필요한 곳에만 쓴다.** 컬럼 매핑, 가맹점 카테고리 분류, 인사이트 문장 생성만 Claude를 쓰고, 금액 합계·정기결제·이상거래 탐지는 결정론적 코드로 계산한다.
- **LLM 출력은 스키마로 검증.** Claude 응답은 tool use/structured output + zod 검증을 거친 뒤에만 사용한다.

## 데이터 흐름

### 분석
```
[Client] 업로드 폼 (파일 1개 또는 여러 개)
  → POST /api/analyses (multipart)
      1. 인증 확인, plan.ts로 파일 개수·월간 한도 검사
      2. 행수/용량 검사 (1,000행, 1MB)
      3. 원본을 Storage `csv-uploads/{user_id}/{analysis_id}/{파일명}`에 저장
      4. analyses row 생성 (status = 'processing')
      5. after()로 파이프라인 예약 → 즉시 202 + analysis_id 응답
  → [after] analysis-pipeline
      a. 인코딩 감지 → CSV 파싱 (lib/csv)
      b. 헤더 + 샘플 5행만 Claude에 전송 → 컬럼 매핑 (파일별)
      c. 매핑으로 전체 행 정규화 → Transaction[]
      d. 고유 가맹점만 추려 배치로 Claude 분류 (배치당 ~200개)
      e. 집계 + (Pro) 정기결제·이상거래 탐지 + (Pro) 인사이트 생성
      f. transactions, analyses.summary/insights 저장, status = 'completed'
      g. (Free) 이전 분석 + 원본 파일 삭제
      실패 시 status = 'failed', error_code 기록
[Client] /dashboard/analyses/[id] → GET /api/analyses/[id]를 2초 간격 폴링 → 결과 렌더
```

### 결제
```
[Client] 업그레이드 버튼 → GET /api/checkout → Polar Checkout (metadata.user_id 포함)
Polar → POST /api/webhooks/polar (서명 검증)
  → subscription.created/updated/canceled/revoked
  → subscriptions upsert (polar_subscription_id 기준, 멱등)
대시보드는 항상 DB의 subscriptions 상태로 플랜을 판단
```

## 데이터베이스 (Supabase Postgres)

| 테이블 | 주요 컬럼 |
|--------|-----------|
| `profiles` | `id`(= auth.users.id), `locale`, `created_at` |
| `subscriptions` | `id`, `user_id`, `polar_subscription_id` (unique), `polar_customer_id`, `status`, `current_period_end`, `updated_at` |
| `analyses` | `id`, `user_id`, `status` (processing/completed/failed), `error_code`, `summary` jsonb, `insights` jsonb, `created_at` |
| `uploads` | `id`, `analysis_id`, `user_id`, `storage_path`, `original_filename`, `row_count`, `column_mapping` jsonb |
| `transactions` | `id`, `analysis_id`, `upload_id`, `user_id`, `occurred_on` date, `amount` numeric, `currency`, `merchant`, `description`, `category`, `is_recurring`, `anomaly_type` |
| `usage_events` | `id`, `user_id`, `created_at` (월간 분석 한도 계산용. 분석 삭제와 무관하게 유지) |

- **모든 테이블 RLS 활성화.** 사용자는 `user_id = auth.uid()`인 row만 SELECT/DELETE 가능.
- `subscriptions`, `usage_events`에 대한 INSERT/UPDATE는 service role만 (웹훅, API 라우트 서버 측).
- Storage 버킷 `csv-uploads`는 private. 정책: 경로 첫 세그먼트가 `auth.uid()`인 객체만 접근.
- 삭제는 `analyses` 기준 cascade (uploads, transactions), Storage 객체는 API 라우트에서 함께 삭제.
- 플랜 판단: `subscriptions.status in ('active', 'trialing')` 또는 `canceled`이지만 `current_period_end > now()`이면 Pro.

## 카테고리 (고정 enum)
`food`, `cafe`, `groceries`, `transport`, `shopping`, `subscription`, `utilities`, `housing`, `health`, `education`, `entertainment`, `travel`, `transfer`, `income`, `other`
- 라벨은 `messages/*.json`에서 번역. Claude는 enum 값만 반환한다.

## 상태 관리
- 서버 상태: Server Components에서 Supabase로 직접 조회
- 분석 진행 상태: Client Component에서 `/api/analyses/[id]` 폴링 (별도 상태 라이브러리 없음)
- 폼/UI 상태: `useState`

## 환경 변수
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY        # 서버 전용
ANTHROPIC_API_KEY                # 서버 전용
POLAR_ACCESS_TOKEN               # 서버 전용
POLAR_WEBHOOK_SECRET             # 서버 전용
POLAR_PRO_PRODUCT_ID
POLAR_SERVER                     # sandbox | production
NEXT_PUBLIC_APP_URL
```

## 테스트
- 단위: Vitest (`lib/`, `services/`는 SDK를 mock)
- 컴포넌트: Vitest + Testing Library
- 테스트 파일은 대상 옆에 `*.test.ts(x)`로 둔다
- 실제 Claude/Polar/Supabase를 호출하는 테스트는 CI에서 실행하지 않는다
