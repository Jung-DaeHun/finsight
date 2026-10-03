# 프로젝트: FinSight

카드 명세서·거래내역 파일(CSV/엑셀)을 Claude로 분석해 보여주는 핀테크 SaaS (MVP).
문서: `docs/PRD.md`, `docs/USER_FLOW.md`, `docs/ARCHITECTURE.md`, `docs/ADR.md`, `docs/UI_GUIDE.md`, `docs/UX_GUIDE.md`

## 언어
- 모든 응답은 한국어로 작성한다.

## 기술 스택
- Next.js 16 (App Router, `proxy.ts`), TypeScript strict mode
- Tailwind CSS (차트는 div 막대로 그린다. 차트 라이브러리 없음)
- Supabase (`@supabase/ssr`, publishable/secret 키, Auth·Postgres·Storage)
- Claude API (`@anthropic-ai/sdk`). 플랜별 모델: Free `CLAUDE_MODEL_FREE`(기본 `claude-sonnet-5-5`), Pro `CLAUDE_MODEL_PRO`(기본 `claude-opus-5-5`)
- Polar (`@polar-sh/nextjs`, 구독 결제)
- 한국어 전용 (i18n 라이브러리 없음), 원화(KRW) 전용
- SheetJS 0.20.3 (CDN tarball), zod
- Vitest + Testing Library
- Vercel (CLI 배포)

## 아키텍처 규칙
- CRITICAL: Claude·Polar 등 외부 API는 `src/services/`에서만 호출할 것. 컴포넌트나 `lib/`에서 SDK를 직접 import하지 말 것
- CRITICAL: `SUPABASE_SECRET_KEY`, `ANTHROPIC_API_KEY`, `POLAR_*` 시크릿은 서버 코드에서만 사용할 것. `NEXT_PUBLIC_` 접두사를 붙이지 말 것. admin 클라이언트와 `lib/data`에는 `import 'server-only'`
- CRITICAL: 권한 판단은 `supabase.auth.getClaims()`로 할 것. `getSession()`으로 권한을 판단하지 말 것
- CRITICAL: 모든 테이블은 클라이언트에서 직접 접근하지 말 것. 서버의 `lib/data`에서만 조회하고, 모든 쿼리에 `user_id = claims.sub` 소유권 조건을 걸 것. `user_id`를 요청 본문 값에서 가져오지 말 것
- CRITICAL: 클라이언트로 보내는 분석 데이터는 `toAnalysisView`로 플랜별 허용 필드만 담을 것. DB row를 그대로 Client Component props나 API 응답에 넣지 말 것
- CRITICAL: 거래 저장·분석 완료 전환·사용량 기록은 `completeAnalysis` RPC 한 곳에서만 수행할 것
- CRITICAL: 구독 상태는 서명 검증된 Polar 웹훅으로만 변경할 것 (`MOCK_SERVICES`에 `polar`가 있을 때의 mock checkout만 예외)
- CRITICAL: mock은 `MOCK_SERVICES` env로만 켤 것. API 키가 없다는 이유로 자동으로 mock을 쓰지 말 것
- CRITICAL: 파일 내용·거래·가맹점명을 로그에 남기지 말 것. 로깅은 `logError()`만 사용
- CRITICAL: 금액 합계·추이·정기결제·이상거래 탐지는 결정론적 코드로 계산할 것. LLM에 숫자 계산을 맡기지 말 것
- CRITICAL: 가맹점명·AI 인사이트는 텍스트로만 렌더할 것. `dangerouslySetInnerHTML`과 마크다운 렌더러를 쓰지 말 것
- CRITICAL: 거래 날짜는 `YYYY-MM-DD` 문자열로 다룰 것. `Date`로 변환해 월별 집계하지 말 것 (시간대 밀림)
- CRITICAL: 통합 테스트를 운영 Supabase 프로젝트에 연결하지 말 것
- Claude 응답은 structured outputs + zod 검증을 거친 뒤에만 사용
- 순수 로직은 `src/lib/`, 도메인 타입·에러 코드는 `src/types/`, UI는 `src/components/`
- 에러 코드 문구는 `src/messages/errors.ts` 한 곳에 둘 것. API 실패 응답은 `{ error: { code } }`
- UI는 `docs/UI_GUIDE.md`를 따를 것

## 개발 프로세스
- CRITICAL: 새 기능 구현 시 반드시 테스트를 먼저 작성하고, 테스트가 통과하는 구현을 작성할 것 (TDD)
- 커밋 메시지는 conventional commits 형식을 따를 것 (feat:, fix:, docs:, refactor:)

## 명령어
npm run dev               # 개발 서버
npm run build             # 프로덕션 빌드
npm run lint              # ESLint
npm run test              # 단위·컴포넌트 테스트
npm run test:integration  # 개발 Supabase 대상 DB 통합 테스트
npm run deploy            # vercel deploy --prod
npm run smoke             # 운영 도메인 200 확인
python3 scripts/execute.py <phase-dir> [--push]  # Harness: phase step을 codex exec로 순차 실행

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
