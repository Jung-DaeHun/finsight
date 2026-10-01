# Step 3: analysis-logic

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/AGENTS.md`
- `/docs/ARCHITECTURE.md` (5.4 인터페이스의 `AnalysisSummary`·`MonthlyTrend`와 추이 규칙, 6절 E8·E12·E16)
- `/docs/ADR.md` (ADR-006)
- `/docs/USER_FLOW.md` (시나리오 3.1, 3.2)
- 이전 step 산출물: `src/types/`, `src/lib/plan.ts`, `src/lib/sheet/normalize.ts`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

테스트를 먼저 작성하고 통과하는 구현을 작성하라 (TDD). 모두 `src/lib/analysis/`의 순수 함수다.

1. **`summarize(txs: Transaction[]): AnalysisSummary`**
   - `totalSpend` = debit 합 − credit 합(취소·환불 차감, E8). 단 `transfer`·`income` 카테고리는 지출 합계·카테고리·상위 가맹점에서 제외 (3.1). 음수가 되면 0
   - `byCategory`: 카테고리별 순지출(0 이하인 카테고리는 제외)
   - `topMerchants`: 순지출 상위 5개, 금액 내림차순
   - `period`: 거래일 문자열의 최소·최대 (`'YYYY-MM-DD'` 문자열 비교)
   - `transactionCount`: 전체 거래 수. `skippedRows`는 인자로 받지 않으므로 0으로 두고, 파이프라인이 normalize의 skipped로 채운다 (시그니처는 바꾸지 마라)
2. **`detect(txs: Transaction[], history: Transaction[]): Transaction[]`** — `txs`에 `isRecurring`·`anomalyType`을 채운 새 배열 반환 (입력 변경 금지)
   - **중복(duplicate)**: 같은 날·같은 가맹점·같은 금액 debit이 2건 이상이면 모두 `duplicate` (E16)
   - **정기결제(recurring)**: `txs + history`에서 같은 가맹점이 서로 다른 월(`occurredOn.slice(0,7)`)에 2개월 이상, 금액 차이 10% 이내로 debit이면 이번 txs의 해당 거래를 `isRecurring = true`
   - **급증(spike)**: 같은 가맹점 history debit 평균의 3배 이상이면서 50,000원 이상인 이번 debit → `spike` (history에 그 가맹점이 2건 미만이면 판정하지 않음). duplicate가 우선
   - 기준값(10%, 3배, 50,000원)은 파일 상단 상수로 둔다
3. **`monthlyTrend(history: Transaction[]): MonthlyTrend`**
   - 월 = `occurredOn.slice(0, 7)` (거래일 기준, 3.2). `Date` 변환 금지 (E12)
   - 월별 순지출(summarize와 같은 제외 규칙), 오름차순
   - `comparison`: 가장 최근 월과 **달력상 직전 월**(문자열 계산: `2026-01`의 직전은 `2025-12`)이 둘 다 있을 때만. 없으면 null. 빠진 달을 0으로 채우거나 그 이전 관측 월로 대체하지 마라
   - `percent`: 전월 합계가 0이면 null, 아니면 소수 1자리 반올림
4. **`src/lib/analysis/index.ts`**에서 세 함수를 export

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
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- `new Date()`·`Date.parse`로 월을 계산하지 마라. 이유: 시간대에 따라 월이 밀린다(E12).
- 이 함수들에서 LLM이나 외부 API를 호출하지 마라. 이유: 금액·탐지는 결정론적 코드로 계산한다(ADR-006).
- 입력 배열·객체를 변경하지 마라. 이유: 호출자가 원본을 저장·재사용한다.
- 기존 테스트를 깨뜨리지 마라
