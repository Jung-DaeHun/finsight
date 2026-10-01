# Step 0: project-setup

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/AGENTS.md`
- `/docs/ARCHITECTURE.md` (5.1 디렉토리 구조, 7절 보안 헤더, 10절 환경 변수, 11.2 배포 전략)
- `/docs/ADR.md` (ADR-001, ADR-013, ADR-014)

아직 앱 코드가 없다. 저장소에는 `docs/`, `scripts/`(Harness용 `execute.py`·`hooks/`), `AGENTS.md`, `CLAUDE.md`, `.claude/`만 있다.

## 사전 확인

- `npx vercel whoami`가 실패하면(로그인 안 됨) 아무것도 만들지 말고 `blocked` 처리한다. `blocked_reason`: "Vercel 로그인 필요: `! npx vercel login` 실행 후 재시도".

## 작업

1. **Next.js 16 앱 구성** (저장소 루트에)
   - App Router, `src/` 디렉토리, TypeScript strict, import alias `@/*` → `src/*`, Tailwind CSS(v4, `@import "tailwindcss"`)
   - `create-next-app`은 비어 있지 않은 디렉토리에서 실패한다. 임시 디렉토리에 생성한 뒤 필요한 파일만 옮기거나 직접 구성하라. 기존 `docs/`, `scripts/`, `AGENTS.md`, `CLAUDE.md`, `.claude/`를 덮어쓰거나 지우지 마라
   - `src/app/layout.tsx`(`<html lang="ko">`), `src/app/page.tsx`(빈 랜딩: 소문자 워드마크 `finsight`와 한 줄 소개만), `src/app/globals.css`(Tailwind import만)
2. **ESLint**: flat config(`eslint.config.mjs`) + `eslint-config-next`. Next 16에는 `next lint`가 없으므로 `"lint": "eslint ."`. `.next/`, `node_modules/`, `docs/design/`, `scripts/` 등 앱 코드가 아닌 경로는 ignore
3. **Vitest + Testing Library**: `vitest.config.ts`(jsdom, `@/*` alias, `@testing-library/jest-dom` setup), `"test": "vitest run"`. 첫 테스트로 `src/app/page.test.tsx`에서 랜딩에 `finsight` 워드마크가 렌더되는지 확인(테스트 먼저 작성)
4. **보안 헤더** (`next.config.ts`의 `headers()`, 모든 경로): `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`
5. **`.gitignore`**: `node_modules`, `.next`, `.vercel`, `.env*.local`, `coverage`, `phases/*/step*-output.json`
6. **로컬 env**: `.env.local`에 `MOCK_SERVICES=claude,polar`, `NEXT_PUBLIC_APP_URL=http://localhost:3000` (시크릿 아님, 커밋 금지)
7. **Vercel 연결과 첫 배포**
   - `npx vercel link --yes`
   - 스크립트: `"deploy": "vercel deploy --prod --yes"`, `"smoke": "node scripts/smoke.mjs"` (`vercel`은 devDependency로 설치)
   - `printf 'claude,polar' | npx vercel env add MOCK_SERVICES production` (이미 있으면 건너뜀)
   - `npm run deploy`로 첫 배포 → 출력의 **운영 도메인**(`https://<project>.vercel.app` 형태 alias, 배포마다 바뀌는 고유 URL 아님)을 `deploy.config.json`에 `{ "prodUrl": "https://..." }`로 기록. `npx vercel project ls` 또는 `npx vercel inspect`로 alias를 확인할 수 있다
   - 같은 값을 `NEXT_PUBLIC_APP_URL` production env로 등록한 뒤 한 번 더 `npm run deploy` (`NEXT_PUBLIC_` 값은 빌드 시점에 들어가므로)
8. **`scripts/smoke.mjs`**: `deploy.config.json`의 `prodUrl`로 GET 요청해 200이면 exit 0, 아니면 상태 코드를 출력하고 exit 1. 의존성 없이 Node 내장 `fetch`만 사용

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
3. 결과에 따라 `phases/0-mvp/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"` (prodUrl 값 포함)
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- `next lint`를 쓰지 마라. 이유: Next.js 16에서 제거됐다.
- 배포마다 바뀌는 고유 URL을 `prodUrl`에 기록하지 마라. 이유: Vercel 배포 보호로 401이 나서 smoke가 실패한다.
- `.env.local`, `.vercel/`을 커밋하지 마라. 이유: 로컬 설정·프로젝트 연결 정보다.
- Supabase·Claude·Polar SDK를 설치하지 마라. 이유: 해당 step에서 설치한다.
- 기존 테스트를 깨뜨리지 마라 (`scripts/test_execute.py` 포함, 수정 금지)
