# UI 디자인 가이드

## 디자인 원칙
1. 도구처럼 보여야 한다. 랜딩을 제외하면 매달 열어보는 가계부 대시보드다.
2. 숫자가 주인공이다. 금액은 크게, 정렬은 오른쪽, 폰트는 tabular-nums.
3. 신뢰가 우선이다. 금융 데이터를 다루므로 화려함보다 차분함과 명확함을 택한다.

## AI 슬롭 안티패턴 — 하지 마라
| 금지 사항 | 이유 |
|-----------|------|
| backdrop-filter: blur() | glass morphism은 AI 템플릿의 가장 흔한 징후 |
| gradient-text (배경 그라데이션 텍스트) | AI가 만든 SaaS 랜딩의 1번 특징 |
| "Powered by AI" 배지 | 기능이 아니라 장식. 사용자에게 가치 없음 |
| box-shadow 글로우 애니메이션 | 네온 글로우 = AI 슬롭 |
| 보라/인디고 브랜드 색상 | "AI = 보라색" 클리셰 |
| 모든 카드에 동일한 rounded-2xl | 균일한 둥근 모서리는 템플릿 느낌 |
| 배경 gradient orb (blur-3xl 원형) | 모든 AI 랜딩 페이지에 있는 장식 |
| ✨ 반짝이 아이콘 | AI 기능 표시의 클리셰 |

## 색상
### 배경
| 용도 | 값 |
|------|------|
| 페이지 | #fafaf9 (stone-50) |
| 카드 | #ffffff |
| 구분선 | #e7e5e4 (stone-200) |

### 텍스트
| 용도 | 값 |
|------|------|
| 주 텍스트 | text-stone-900 |
| 본문 | text-stone-700 |
| 보조 | text-stone-500 |
| 비활성 | text-stone-400 |

### 브랜드/시맨틱 색상
| 용도 | 값 |
|------|------|
| 포인트 (버튼, 링크, 강조) | #15803d (green-700) |
| 지출 증가 / 이상거래 / 에러 | #dc2626 (red-600) |
| 지출 감소 / 성공 | #15803d (green-700) |
| 경고 (정기결제 알림) | #b45309 (amber-700) |
| 중립 | #78716c (stone-500) |

### 차트 카테고리 팔레트
- 차트 색상은 `dataviz` 스킬 가이드로 검증된 팔레트를 `lib/chart-colors.ts` 한 곳에 정의하고 재사용한다.

## 컴포넌트
### 카드
```
rounded-md bg-white border border-stone-200 p-5
```

### 버튼
```
Primary: rounded-md bg-green-700 text-white px-4 py-2 text-sm font-medium hover:bg-green-800
Secondary: rounded-md border border-stone-300 bg-white text-stone-900 px-4 py-2 text-sm hover:bg-stone-50
Text:    text-stone-500 hover:text-stone-900
```

### 입력 필드
```
rounded-md bg-white border border-stone-300 px-3 py-2 text-sm focus:border-green-700 focus:outline-none
```

### Pro 잠금 카드
- 실제 카드와 같은 크기의 카드에 기능 설명 한 줄과 "Pro로 업그레이드" 버튼만 표시한다. 가짜 데이터를 흐리게 깔지 않는다.

## 레이아웃
- 대시보드 너비: max-w-6xl, 랜딩: max-w-5xl
- 정렬: 좌측 정렬 기본. 랜딩 히어로만 예외
- 간격: 카드 간 gap-4, 섹션 간 space-y-8
- 모바일(375px)에서 가로 스크롤 없이 동작

## 타이포그래피
- 폰트: Pretendard (한/영 공용), 숫자는 `tabular-nums`
| 용도 | 스타일 |
|------|--------|
| 페이지 제목 | text-2xl font-semibold text-stone-900 |
| 카드 제목 | text-sm font-medium text-stone-500 |
| 핵심 금액 | text-3xl font-semibold tabular-nums text-stone-900 |
| 본문 | text-sm text-stone-700 leading-relaxed |

## 애니메이션
- 분석 중 상태의 진행 표시 (단순 스피너 또는 진행 바)
- hover 색상 전환 (transition-colors 150ms)
- 그 외 모든 애니메이션 금지

## 아이콘
- lucide-react, strokeWidth 1.5, size 16~20
- 아이콘 컨테이너(둥근 배경 박스)로 감싸지 않는다
