# Step 14: landing

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/AGENTS.md`
- `/docs/PRD.md` (1. 랜딩 페이지, 4. 대시보드 표, 5. 결제, 7. 배포의 국외 이전)
- `/docs/USER_FLOW.md` (J1)
- `/docs/ARCHITECTURE.md` (5.1의 `page.tsx`·`terms/ privacy/`, 7절 개인정보)
- `/docs/UI_GUIDE.md`, `/.claude/skills/finsight-design/SKILL.md` ("랜딩" 절)
- `/docs/design/fs-public.jsx` (`Landing`)
- `/docs/design/FinSight.html` `<style>` (`.fs-hero*`, `.fs-feat*`, `.fs-steps`, `.fs-price*`, `.fs-cta`, `.fs-foot` 등 `grep`)
- 이전 step 산출물: `src/app/page.tsx`, `src/components/ui/`(PublicHeader 등), `src/sample/analysis.json`, `src/lib/format.ts`, `src/lib/plan.ts`(limits), `src/lib/auth.ts`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

컴포넌트 테스트를 먼저 작성하라 (TDD).

1. **`src/app/page.tsx`** (Server Component) — `getUserId()`로 로그인 여부 판단 → PublicHeader(`signedIn`) + `src/components/landing/` 섹션들. 로그인 상태면 모든 `무료로 시작하기` CTA가 `/dashboard`로
2. **섹션** (SKILL.md "랜딩" 절 순서·문구 그대로)
   - 히어로: 카피 + [무료로 시작하기(`/signup`)][샘플 결과 보기(`/sample`)] + 오른쪽 미리보기 카드. **숫자는 `src/sample/analysis.json`에서** 가져온다(총지출, 비중 스트립, 상위 4개 카테고리, 정기결제·이상거래 건수)
   - 기능 `#features`: 타일 4개(file-spreadsheet / pie-chart / repeat / layers)
   - 이용 방법 3단계
   - 요금제 `#pricing`: Free $0 / Pro $9 / 월 + 비교표 7행. 숫자(파일 수, 월 분석 횟수)는 `limits('free')`·`limits('pro')`에서 가져와 문서와 어긋나지 않게 한다. 하단 캡션(월 분석 횟수는 성공 기준·KRW 전용)
   - CTA 밴드, 푸터(워드마크 / 이용약관 `/terms` · 개인정보처리방침 `/privacy` · 문의 `mailto:`는 상수 하나로 / © 2026 finsight)
3. **`src/app/terms/page.tsx`, `src/app/privacy/page.tsx`** — 정적 텍스트 페이지(PublicHeader + 좁은 폭 본문). 개인정보처리방침에는 수집 항목(이메일, 업로드 원본 파일과 거래 내역), 보관(사용자가 삭제하거나 탈퇴할 때까지), 처리 위탁·국외 이전(Anthropic — 미국 — 가맹점명·명세서 헤더 일부 분류/인사이트 생성, Polar — 미국 — 결제, Vercel — 미국 — 호스팅, Supabase — 대한민국(서울 리전) — 저장), 삭제 방법(설정에서 개별 삭제·회원 탈퇴)을 적는다. 법률 자문 대체가 아니라는 문장은 넣지 않는다
4. **메타데이터**: 루트 layout의 `metadata`(title `finsight — 명세서를 올리면 지출이 정리됩니다`, description)
5. **테스트**: 비로그인/로그인 CTA 링크, 요금제 숫자가 limits와 일치, 히어로 숫자가 sample JSON과 일치, 푸터 링크, privacy 페이지에 수탁사 4곳이 표시

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
   - AGENTS.md CRITICAL 규칙을 위반하지 않았는가?
   - UI_GUIDE 안티패턴: `grep -rn "shadow\|gradient\|backdrop-blur" src/components/landing/`, 이모지·"Powered by AI" 배지 없음
3. 결과에 따라 `phases/0-mvp/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 랜딩 미리보기 숫자를 하드코딩하지 마라. 이유: 샘플 결과와 어긋난다. `sample/analysis.json`에서 읽는다.
- 요금제 숫자를 하드코딩하지 마라(가격 $9 제외). 이유: `limits()`가 원본이다.
- 스크롤·바운스 애니메이션, 그라데이션 히어로, 일러스트를 추가하지 마라. 이유: UI_GUIDE 원칙.
- 기존 테스트를 깨뜨리지 마라
