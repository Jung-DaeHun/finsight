# Step 13: settings

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/AGENTS.md`
- `/docs/PRD.md` (6. 설정)
- `/docs/USER_FLOW.md` (J7)
- `/docs/ARCHITECTURE.md` (5.3.3 분석 삭제·회원 탈퇴, 5.4 API 표의 `DELETE /api/account`, 7절 삭제 권한, 12.1 R1)
- `/docs/ADR.md` (ADR-011)
- `/docs/UI_GUIDE.md`, `/.claude/skills/finsight-design/SKILL.md` ("설정" 절)
- `/docs/design/fs-app.jsx` (`Settings`)
- `/docs/design/FinSight.html` `<style>` (`.fs-modal`, `.fs-scrim`, `.fs-set*` 등 `grep`)
- 이전 step 산출물: `src/services/deletion.ts`(deleteAnalysis), `src/services/polar.ts`(cancelSubscriptions, createPortalUrl), `src/lib/data/`(listAnalyses, getSubscriptionSummary, countMonthlyUsage), `src/app/api/analyses/[id]/route.ts`(DELETE), `src/components/ui/`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

테스트를 먼저 작성하라 (TDD). Polar·Storage·Supabase admin은 mock한다.

1. **`src/services/deletion.ts`에 추가** — `deleteAccount(userId: string): Promise<void>`
   - ① `cancelSubscriptions(userId)` 실패 → `AccountDeletionError('subscription_cancel_failed')`로 중단
   - ② Storage `{userId}/` prefix 전체를 페이지 끝까지 list → 파일 경로로 삭제 → 다시 list해 비었는지 확인. 실패 → `'storage_delete_failed'`로 중단
   - ③ `auth.admin.deleteUser(userId)` (DB cascade). 실패 → `'account_delete_failed'`
   - 앞 단계가 실패하면 뒤 단계를 호출하지 않는다. 이미 취소된 구독·없는 객체는 성공으로 처리해 재시도가 통과해야 한다
2. **`DELETE /api/account`** — 401 → `deleteAccount` → 성공 시 세션 쿠키 정리(signOut) 후 204, 실패 시 502 + 해당 코드
3. **`src/app/settings/page.tsx`** (Server Component) + `src/components/dashboard/settings/` Client Component들 — SKILL.md "설정" 절 그대로, 좁은 폭
   - 구독: Pro `Pro · $9/월 · 다음 결제일 {formatFullDate}`(해지 예약이면 `{날짜}까지 Pro`) + `구독 관리`(`/api/portal`), Free `Free · 이번 달 분석 N/5회 사용` + `Pro로 업그레이드`(`/api/checkout`)
   - 분석 기록 (N): 삭제 안내 캡션(삭제해도 이번 달 사용 횟수는 돌아오지 않음) + 행(제목 / 파일 · 생성일 / trash-2 IconButton) → 인라인 `취소`·`삭제` 확인 → `DELETE /api/analyses/{id}` → 성공 시 행 제거 + Toast, 409·502는 문구 표시 후 재시도 가능
   - 계정: 이메일 + `회원 탈퇴`(sale 텍스트 버튼)
   - 탈퇴 모달: 스크림 + 처리 순서 3단계 + `'탈퇴'를 입력하세요` Field(정확히 `탈퇴`일 때만 활성) + [취소][탈퇴하기]. 진행 중 바깥 클릭·Esc로 닫히지 않음. 성공 → `/`로 이동. 실패 → 실패한 단계와 문구 표시 + 다시 시도
   - AppHeader `active="settings"`
4. **테스트**
   - deleteAccount: 구독 취소 실패 시 Storage·auth 미호출, Storage 실패 시 auth 미호출, 재시도 시 이미 취소/삭제된 상태가 성공 처리, Storage list 페이지네이션 (R1)
   - API: 401, 502 코드별, 204
   - UI: `탈퇴` 정확히 입력해야 버튼 활성, 진행 중 모달 닫힘 방지, 인라인 삭제 확인·취소, 삭제 실패 문구

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
3. 결과에 따라 `phases/0-mvp/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- auth 사용자를 먼저 지우지 마라. 이유: 구독이 계속 청구되거나 원본이 남은 채 연결 정보를 잃는다(ADR-011).
- 로컬 `subscriptions` row가 없다고 Polar 조회를 건너뛰지 마라. 이유: 웹훅 누락 시 청구 중인 구독이 남는다(R1).
- 브라우저에서 Supabase `auth.admin`이나 Storage 삭제를 호출하지 마라. 이유: 삭제는 서버만(7절).
- "데이터 전체 삭제(계정 유지)" 기능을 만들지 마라. 이유: MVP 제외 사항.
- 기존 테스트를 깨뜨리지 마라
