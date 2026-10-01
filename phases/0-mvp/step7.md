# Step 7: auth-flow

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/AGENTS.md`
- `/docs/PRD.md` (2. 인증, 7. 배포의 국외 이전 동의)
- `/docs/USER_FLOW.md` (3. 화면 흐름, J1)
- `/docs/ARCHITECTURE.md` (5.1 `auth/callback`·`auth/confirm`·`proxy.ts`, 7절 인증 확인·계정 열거·개인정보)
- `/docs/UI_GUIDE.md`
- `/.claude/skills/finsight-design/SKILL.md` ("인증" 절, 이식 규칙)
- `/docs/design/fs-public.jsx` (`AuthShell`, `Login`, `Signup`, `VerifySent`, `Reset`)
- `/docs/design/FinSight.html` `<style>` (`.fs-auth*` 등 `grep`)
- 이전 step 산출물: `src/lib/supabase/{server,browser}.ts`, `src/lib/auth.ts`, `src/components/ui/`(Button, Field, Wordmark, AppHeader), `src/messages/errors.ts`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

폼 검증·상태 컴포넌트 테스트를 먼저 작성하라 (TDD). Supabase 호출은 테스트에서 mock한다.

1. **`src/proxy.ts`** (Next 16, `middleware.ts` 아님): `@supabase/ssr` 공식 패턴으로 세션 쿠키 갱신. `/dashboard`·`/settings` 하위에서 `getClaims()`로 인증이 없으면 `/login`으로 redirect. 정적 파일·`/api/webhooks`는 matcher에서 제외
2. **화면** (`src/app/login/`, `signup/`, `reset-password/`, 폼은 `src/components/` 아래 Client Component) — SKILL.md "인증" 절과 `fs-public.jsx` 그대로
   - 로그인: Google로 계속하기 → `또는 이메일` → 이메일·비밀번호 → `비밀번호를 잊으셨나요?` → 로그인 → 회원가입 링크. 성공 시 항상 `/dashboard`
   - 회원가입: 동의 박스(필수 2개: 이용약관·개인정보 수집(`/terms`, `/privacy` 링크), 국외 이전 — Anthropic·Polar·Vercel(미국)). 두 항목 모두 체크해야 이메일 가입과 Google 가입 버튼이 활성. `signUp`의 `emailRedirectTo`는 `${NEXT_PUBLIC_APP_URL}/auth/confirm`
   - 인증 메일 발송 화면(`/signup` 안의 상태): 이메일 굵게 + `인증 메일 다시 보내기`(`auth.resend`)
   - 비밀번호 재설정: 이메일 입력 → `resetPasswordForEmail`(`redirectTo` = `/auth/confirm?next=/reset-password`) → 발송 안내. `/reset-password`가 복구 세션 상태로 열리면 새 비밀번호 입력 폼(`updateUser`)을 보여준다
   - 검증 문구: `이메일 형식을 확인해 주세요.` / `비밀번호는 8자 이상입니다.` / `필수 항목에 동의해 주세요.`
   - 로그인 상태로 `/login`·`/signup`에 오면 `/dashboard`로 이동
3. **`src/app/auth/callback/route.ts`**: OAuth `code` → `exchangeCodeForSession` → `/dashboard`. 실패 시 `/login?error=...`
4. **`src/app/auth/confirm/route.ts`**: `token_hash` + `type` → `verifyOtp` → `next`(허용 목록: `/dashboard`, `/reset-password`만, 기본 `/dashboard`)로 이동. 다른 기기에서 연 링크도 동작해야 하므로 PKCE code가 아니라 `token_hash` 방식이다
5. **로그아웃**: AppHeader의 `로그아웃`을 Server Action(`signOut` → `/`)에 연결
6. **임시 대시보드**: `src/app/dashboard/page.tsx`가 없으면 AppHeader + `대시보드` 제목만 있는 페이지를 만든다(로그인 확인용, dashboard-upload step에서 교체)
7. **테스트**: 이메일·비밀번호·동의 검증 문구, 동의 전 버튼 비활성, `auth/confirm`의 `next` 허용 목록(외부 URL·`//evil.com` 거부), proxy의 보호 경로 판정 함수

## 사용자 수동 설정 (코드로 확인 불가)

Supabase 대시보드의 이메일 템플릿(token_hash 링크), Site URL·Redirect URLs, Google OAuth 공급자 설정은 이 step에서 검증할 수 없다. 설정 여부로 `blocked` 처리하지 말고, `summary`에 "수동 설정 필요: 이메일 템플릿 token_hash, Redirect URL `{prodUrl}/auth/callback`·`{prodUrl}/auth/confirm`, Google 공급자"를 남겨라.

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
   - AGENTS.md CRITICAL 규칙을 위반하지 않았는가? (`grep -rn "getSession" src/` 결과가 권한 판단에 쓰이지 않는지)
3. 결과에 따라 `phases/0-mvp/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- `middleware.ts`를 만들지 마라. 이유: Next.js 16은 `proxy.ts`를 쓴다.
- `getSession()`으로 로그인 여부를 판단하지 마라. 이유: 쿠키 값을 검증하지 않는다. `getClaims()`를 쓴다.
- 로그인 후 원래 경로로 돌려보내는 `redirect` 파라미터를 만들지 마라. 이유: MVP 제외 사항이며 오픈 리다이렉트 위험. 항상 `/dashboard`.
- 가입 응답에 따라 "이미 가입된 이메일" 같은 문구를 보여주지 마라. 이유: 계정 열거 방지(7절).
- 기존 테스트를 깨뜨리지 마라
