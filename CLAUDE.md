# 프로젝트: FinSight

카드 명세서·거래내역 CSV를 Claude로 분석해 보여주는 핀테크 SaaS (MVP).

## 기술 스택
- Next.js (App Router), TypeScript strict mode
- Tailwind CSS
- Supabase (Auth, Postgres, Storage)
- Claude API (`@anthropic-ai/sdk`)
- Polar (구독 결제)
- next-intl (ko/en)
- Vitest + Testing Library
- Vercel 배포

## 아키텍처 규칙
- CRITICAL: Claude·Polar 등 외부 API는 `src/services/`에서만 호출할 것. 컴포넌트나 `lib/`에서 SDK를 직접 import하지 말 것
- CRITICAL: `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `POLAR_*` 시크릿은 서버 코드에서만 사용할 것. `NEXT_PUBLIC_` 접두사를 붙이지 말 것
- CRITICAL: 모든 테이블에 RLS를 켜고, 사용자 데이터 쿼리는 `user_id = auth.uid()` 정책을 거치게 할 것. service role 클라이언트는 웹훅·분석 파이프라인·계정 삭제에서만 사용
- CRITICAL: 구독 상태는 서명 검증된 Polar 웹훅으로만 변경할 것. 체크아웃 성공 리다이렉트를 근거로 플랜을 바꾸지 말 것
- CRITICAL: CSV 원본·거래내역 내용을 로그(console, 에러 리포트)에 남기지 말 것
- CRITICAL: 금액 합계·추이·정기결제·이상거래 탐지는 결정론적 코드로 계산할 것. LLM에 숫자 계산을 맡기지 말 것
- Claude 응답은 zod 스키마로 검증한 뒤에만 사용
- 순수 로직은 `src/lib/`, 도메인 타입은 `src/types/`, UI는 `src/components/`
- 사용자에게 보이는 문자열은 `src/messages/{ko,en}.json`에 둘 것 (하드코딩 금지)
- UI는 `docs/UI_GUIDE.md`를 따를 것

## 개발 프로세스
- CRITICAL: 새 기능 구현 시 반드시 테스트를 먼저 작성하고, 테스트가 통과하는 구현을 작성할 것 (TDD)
- 커밋 메시지는 conventional commits 형식을 따를 것 (feat:, fix:, docs:, refactor:)

## 명령어
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
npm run lint     # ESLint
npm run test     # 테스트
