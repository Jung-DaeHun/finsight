# Step 15: go-live

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/AGENTS.md`
- `/docs/ARCHITECTURE.md` (5.2.2 실행 시간, 7절 보안, 10절 운영·환경 변수·사전 준비, 11.2 배포 전략, 12절 검증, 12.1 R1~R8)
- `/docs/ADR.md` (ADR-005, ADR-013)
- `/docs/USER_FLOW.md` (J1~J7)
- 이전 step 산출물: `src/services/claude-config.ts`, `scripts/measure-claude.*`(`npm run measure:claude`), `supabase/migrations/`, `src/lib/mock.ts`, `deploy.config.json`, `vitest.integration.config.ts`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 사전 확인

`.env.go-live.local`(gitignore 대상)에 아래 값이 모두 있어야 한다. 하나라도 없으면 아무것도 바꾸지 말고 `blocked` 처리하고, 빠진 이름을 `blocked_reason`에 나열한다.

- 운영 Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_PROD_DB_URL`(Postgres 연결 문자열)
- `ANTHROPIC_API_KEY`
- Polar 샌드박스: `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`(웹훅 엔드포인트 `{prodUrl}/api/webhooks/polar`를 사용자가 등록하고 받은 값), `POLAR_PRO_PRODUCT_ID`, `POLAR_SERVER=sandbox`

추가로 `.env.go-live.local`의 `NEXT_PUBLIC_SUPABASE_URL`이 `.env.local`의 값과 같으면 `blocked`("운영 프로젝트와 개발 프로젝트가 같음").

## 작업

1. **Claude 응답 시간 실측** — `ANTHROPIC_API_KEY`를 `.env.go-live.local`에서 읽어 `npm run measure:claude` 실행. Sonnet(Free)·Opus(Pro)의 매핑 1회·가맹점 100개 분류 시간을 기록하고, Free 최대 입력(1파일·1,200행)과 Pro 최대 입력(3파일·3,600행)의 예상 총 시간이 240초 안인지 계산한다. 필요하면 `src/services/claude-config.ts`의 timeout·배치 크기·동시성을 조정한다(조정 시 단위 테스트 갱신). 측정값을 `phases/0-mvp/go-live-checklist.md`에 기록
2. **운영 DB** — `npx supabase db push --db-url "$SUPABASE_PROD_DB_URL"`. `supabase link`를 운영 프로젝트로 바꾸지 마라(개발 프로젝트 link 유지)
3. **Vercel production env 교체** — `.env.go-live.local` 값으로 `vercel env rm <NAME> production --yes`(있으면) → `vercel env add <NAME> production`: Supabase 3개, `ANTHROPIC_API_KEY`, `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_PRO_PRODUCT_ID`, `POLAR_SERVER`. `SUPABASE_PROD_DB_URL`은 올리지 마라. 마지막으로 **`MOCK_SERVICES`를 production env에서 삭제**
4. **최종 배포** — AC의 deploy·smoke. 배포 후 `{prodUrl}`에 데모 모드 띠가 없는지 `curl -s {prodUrl} | grep -c "데모 모드"`가 0인지 확인
5. **수동 체크리스트 작성** — `phases/0-mvp/go-live-checklist.md`에 사용자가 직접 확인할 항목을 체크박스로 작성:
   - 운영 Supabase 대시보드: 이메일 템플릿 token_hash 방식, Site URL·Redirect URLs(`{prodUrl}/auth/callback`, `{prodUrl}/auth/confirm`), Google 공급자, 서울 리전
   - Anthropic 콘솔 월 사용 한도, Vercel Pro 전환(Hobby는 상업적 이용 금지)
   - ARCHITECTURE 12절 수동 확인 흐름: 이메일 가입(다른 기기에서 인증 링크) → 샘플 → 국내 카드사 엑셀 3종 + 은행 1종 업로드 → 결과 → Polar 샌드박스 결제 → Pro 기능 해제 → 포털에서 해지 → 회원 탈퇴
   - 계정 2개로 A의 분석 ID를 B가 결과 페이지·DELETE·insights에 사용 → 404 (R1, R4)
   - Free 계정 결과 페이지 HTML/RSC payload에 `anomalyType`·`trend`·`insights`가 없는지 (R4)
   - 분석 중 탭을 닫은 뒤 대시보드에서 결과가 저장됐는지(연결 종료 후 처리, 2.1)
   - Pro 최대 입력 분석이 240초 안에 끝나는지 (PRD 성공 기준)
   - 각 항목에 관련 R/J 번호 표기

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
npm run test:integration   # 개발 프로젝트 대상 (.env.local) — 운영에 연결하지 않음
npm run deploy
npm run smoke
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - ADR 기술 스택을 벗어나지 않았는가?
   - AGENTS.md CRITICAL 규칙을 위반하지 않았는가?
   - `npx vercel env ls production`에 `MOCK_SERVICES`가 없고, `NEXT_PUBLIC_`으로 시작하는 시크릿이 없는가?
3. 결과에 따라 `phases/0-mvp/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"` (측정값, 확정 timeout, 체크리스트 경로 포함)
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 운영 값을 `.env.local`에 쓰거나 통합 테스트를 운영 프로젝트로 돌리지 마라. 이유: AGENTS.md CRITICAL. `.env.local`은 개발 프로젝트 전용이다.
- `.env.go-live.local`의 값이나 키를 커밋·로그·`summary`·체크리스트에 적지 마라. 이유: 시크릿 유출.
- `supabase link`를 운영 프로젝트로 바꾸지 마라. 이유: 이후 개발용 `db push`가 운영에 적용된다.
- 수동 체크리스트 항목을 직접 수행한 것처럼 체크하지 마라. 이유: 사용자가 실제 브라우저·결제로 확인해야 한다.
- 기존 테스트를 깨뜨리지 마라
