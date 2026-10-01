# Step 2: sheet-parsing

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/AGENTS.md`
- `/docs/ARCHITECTURE.md` (5.2.1 파일 읽기·행수·인코딩, 6절 엣지 케이스 E1~E17, 12.1 R3·R6·R7, 12.2 SheetJS 공식 문서 링크)
- `/docs/ADR.md` (ADR-007, ADR-008)
- 이전 step 산출물: `src/types/`(ReadRowsResult, ColumnMapping, RawTx, AnalysisErrorCode), `src/lib/plan.ts`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

테스트(fixture)를 먼저 작성하고 통과하는 구현을 작성하라 (TDD).

1. **SheetJS 설치**: `npm i https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`. 레거시 xls codepage 지원은 `xlsx/dist/cpexcel.full.mjs`를 `set_cptable`로 로드한다 (공식 Node 설치 문서 참고)
2. **에러 표현**: `src/lib/sheet/errors.ts`에 `class SheetError extends Error { code: AnalysisErrorCode }`. 파이프라인이 이 code로 실패를 기록한다
3. **`src/lib/sheet/read-rows.ts`** — `readRows(bytes: ArrayBuffer): ReadRowsResult`
   - 형식 판별: 바이트 시그니처로 xlsx(ZIP `PK`)·바이너리 xls(OLE `D0 CF 11 E0`)·텍스트(CSV / HTML 표 xls)를 구분
   - 텍스트: BOM 제거 → `new TextDecoder('utf-8', { fatal: true })` → 실패 시 `new TextDecoder('euc-kr', { fatal: true })` → 둘 다 실패면 `unsupported_encoding`. 디코딩한 문자열을 `XLSX.read(str, { type: 'string', sheetRows: 1201 })`에 넘긴다 (구분자는 SheetJS 판별)
   - 바이너리: 텍스트 디코딩 없이 `XLSX.read(bytes, { type: 'array', sheetRows: 1201 })`
   - 암호 걸린 파일(SheetJS가 암호 관련 에러를 던짐, 또는 OLE 안에 `EncryptedPackage` 스트림) → `file_encrypted`
   - 첫 시트만 `sheet_to_json(ws, { header: 1, raw: false, defval: '' })`로 `string[][]`로 변환. 모든 셀을 문자열로, 빈 행도 위치를 유지
   - 행이 1,201개 이상이면 `too_many_rows` (잘린 결과를 반환하지 마라). 행이 없으면 `file_unreadable`. 그 외 파싱 실패도 `file_unreadable`
   - `encoding`: `'utf-8' | 'cp949' | null`(바이너리)
4. **`src/lib/sheet/normalize.ts`** — `normalize(rows: string[][], m: ColumnMapping): { txs: RawTx[]; skipped: number }`
   - `headerRowIndex` 행에서 컬럼명으로 열 위치를 찾는다. 헤더 이후 행만 처리
   - 날짜: `dateFormat`에 따라 `'YYYY-MM-DD'` **문자열**로 만든다. `Date` 객체·`new Date()`를 쓰지 마라. 연도 없는 형식은 `assumedYear`, 행 순서상 12월→1월로 넘어가면 연도 +1 (E11)
   - 금액: `12,000원`, `₩12,000`, `(12,000)`, `-12,000`, 공백 처리 (E6). `single` 모드는 부호·`debitIsNegative`로 debit/credit 결정, `split` 모드는 출금/입금 열 (E7). 결과 `amount`는 항상 양수 정수
   - 0원 행 제외 (E15), skipped에 포함
   - 빈 행·반복 헤더 행·명확한 합계/소계 행(가맹점·설명 칸에 `합계`, `소계`, `총계`, `total` 등이 있고 날짜가 비어 있는 행)은 구조행으로 보고 제외하며 skipped에 넣지 않는다. 날짜 파싱 실패만으로 합계행으로 간주하지 마라 (E5)
   - 구조행을 뺀 행 중 날짜·금액 오류가 20%를 넘으면 `too_many_invalid_rows`, 유효 거래가 0건이면 `not_transactions` (E13, E14)
5. **fixture** (`src/lib/sheet/__fixtures__/`): 테스트 코드에서 생성해도 된다 (`XLSX.write`, `iconv` 없이 CP949는 바이트 배열 상수로)
   - UTF-8 BOM CSV, BOM 없는 UTF-8 CSV, EUC-KR CSV, CP949 확장 문자(예: `똠`, `햏`) CSV, CP949 HTML-xls, xlsx, 세미콜론·탭 구분 CSV, 잘못된 바이트 → `unsupported_encoding` (R6)
   - 각 형식에서 1,200행 성공·1,201행 `too_many_rows`, 인용부호 안 줄바꿈은 1행 (R3)
   - 제목 행 + 헤더 + 거래 + 빈 행 + 합계 행이 섞인 파일에서 거래 합계가 기대값과 일치 (R3, E4, E5)
   - 금액 표기 변형, 입출금 분리, 연도 없는 날짜의 연말 넘김, 0원 행, 20% 초과 오류

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

- npm의 `xlsx@0.18.x`를 설치하지 마라. 이유: CVE 2건. CDN tarball 0.20.3만 쓴다.
- 디코딩 실패 시 대체 문자(U+FFFD)로 계속 진행하지 마라. 이유: 깨진 가맹점명으로 분석하면 안 된다.
- 1,201행 이상일 때 앞 1,200행으로 분석하지 마라. 이유: 잘린 결과를 정상 결과처럼 보이게 된다.
- `iconv-lite` 등 인코딩 라이브러리를 추가하지 마라. 이유: `TextDecoder`로 충분하다(ADR-007).
- 이 파일에서 Claude를 호출하지 마라. 이유: 순수 함수다. 컬럼 매핑은 `ColumnMapping`을 인자로 받는다.
- 기존 테스트를 깨뜨리지 마라
