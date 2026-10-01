# Step 12: billing

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/AGENTS.md`
- `/docs/PRD.md` (5. 결제)
- `/docs/USER_FLOW.md` (J4, J6)
- `/docs/ARCHITECTURE.md` (5.3 subscriptions, 5.4 polar.ts·API 표의 checkout·portal·webhook, 5.5 웹훅 규칙, 7절 구독 변경, 11.2 Polar mock)
- `/docs/ADR.md` (ADR-004, ADR-013)
- `/docs/UI_GUIDE.md`, `/.claude/skills/finsight-design/SKILL.md` ("대시보드"의 결제 대기 배너)
- `/docs/design/fs-app.jsx` (`Dashboard`의 checkout 배너 부분만 — `Checkout` 화면은 구현하지 않는다)
- 이전 step 산출물: `src/lib/data/`(getUserPlan), `src/lib/plan.ts`(resolvePlan), `src/lib/mock.ts`, `src/lib/auth.ts`, `src/app/dashboard/page.tsx`, `src/components/ui/LockCard.tsx`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

테스트를 먼저 작성하라 (TDD). Polar SDK는 mock한다.

1. **설치**: `@polar-sh/sdk`, `@polar-sh/nextjs`
2. **`lib/data` 추가** (server-only)
   - `upsertSubscription({ userId, polarSubscriptionId, polarCustomerId, status, cancelAtPeriodEnd, currentPeriodEnd })` — `polar_subscription_id` 기준 upsert
   - `userExists(userId): Promise<boolean>` — 웹훅의 external ID 확인용
   - `getSubscriptionSummary(userId): Promise<{ plan: Plan; status?: string; cancelAtPeriodEnd?: boolean; currentPeriodEnd?: string } >`
3. **`src/services/polar.ts`** (`import 'server-only'`) — `isMocked('polar')`로 실제/mock 선택 (키 유무로 선택 금지)
   ```ts
   createCheckout(userId: string, email: string): Promise<string>   // checkout URL
   createPortalUrl(userId: string): Promise<string | null>          // 고객 없음 → null
   cancelSubscriptions(userId: string): Promise<void>               // 탈퇴용 (settings step에서 사용)
   ```
   - 실제: `new Polar({ accessToken: POLAR_ACCESS_TOKEN, server: POLAR_SERVER })`. 체크아웃은 `POLAR_PRO_PRODUCT_ID`, `externalCustomerId = userId`, `successUrl = ${NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`. 포털은 external ID로 고객 세션 생성. `cancelSubscriptions`는 **로컬 subscriptions와 무관하게** Polar에서 `externalCustomerId = userId`로 활성 구독을 모두 조회해 취소(즉시 취소 또는 revoke)하고, 다시 조회해 청구 가능한 구독이 없음을 확인. 이미 취소된 구독은 성공으로 처리. 실패 시 `PolarServiceError`
   - mock: `createCheckout`은 `upsertSubscription(status 'active', polarSubscriptionId = 'mock_' + userId)` 후 `/dashboard?checkout=success` 반환, `createPortalUrl`은 `/settings`, `cancelSubscriptions`는 mock 구독을 `canceled`로
4. **라우트**
   - `GET /api/checkout` — 401 → 이미 Pro면 409 `already_pro` → `createCheckout` → 302
   - `GET /api/portal` — 401 → URL 없으면 404 → 302
   - `POST /api/webhooks/polar` — `@polar-sh/nextjs`의 `Webhooks({ webhookSecret: POLAR_WEBHOOK_SECRET, ... })`로 **서명 검증**(불일치 403). `subscription.created/updated/active/canceled/uncanceled/revoked`에서 `customer.externalId`로 사용자 매핑 → 없는 사용자면 200 무시 → `upsertSubscription` → 200. DB 실패는 500(재시도 유도). `revoked`면 status `revoked`로 저장해 Free가 되게
   - 웹훅 라우트는 `proxy.ts` 보호 대상이 아니어야 한다(이미 제외됐는지 확인)
5. **결제 확인 배너** — `/dashboard?checkout=success`인데 아직 Free면 상단 soft-cloud 배너(스피너 + `결제 확인 중` + 설명), Client Component가 3초마다 `router.refresh()`(최대 20회), Pro가 되면 배너 제거. Pro면 배너 없이 Toast `Pro가 활성화됐습니다`
6. **테스트**: checkout 401/409/302, mock 모드 checkout이 subscriptions를 active로 기록, 키가 없어도 `MOCK_SERVICES` 미설정이면 mock으로 가지 않음, 웹훅 서명 불일치 403, 알 수 없는 사용자 200, DB 실패 500, revoked → Free 판정, cancelSubscriptions가 로컬 row 없이도 Polar 조회 수행(R1), 배너 refresh 횟수 상한

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
   - AGENTS.md CRITICAL 규칙을 위반하지 않았는가? (`grep -rn "@polar-sh" src/`가 `services/`와 웹훅 라우트(`@polar-sh/nextjs`)에만 있는지)
3. 결과에 따라 `phases/0-mvp/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 체크아웃 성공 리다이렉트(`?checkout=success`)만 보고 구독을 활성화하지 마라. 이유: 구독 상태는 서명 검증된 웹훅으로만 바꾼다(mock 모드만 예외).
- 웹훅 본문의 user ID를 서명 검증 전에 신뢰하지 마라. 이유: 위조 요청으로 Pro 전환 가능.
- Checkout 화면(디자인의 `Checkout`)을 만들지 마라. 이유: 실제 결제는 Polar 호스팅 페이지다.
- Polar 시크릿에 `NEXT_PUBLIC_` 접두사를 붙이지 마라. 이유: 서버 전용 키.
- 실제 Polar 키를 이 step에서 등록하지 마라. 이유: go-live step에서 한다. 지금은 `MOCK_SERVICES=claude,polar`로 배포된다.
- 기존 테스트를 깨뜨리지 마라
