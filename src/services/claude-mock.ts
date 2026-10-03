import type { AnalysisSummary, Category, ColumnMapping, Insight, MonthlyTrend, Plan } from "@/types";

type InsightInput = {
  summary: AnalysisSummary;
  detections: { recurringCount: number; anomalyCount: number };
  trend?: MonthlyTrend;
};

const FOREIGN_AMOUNT = /USD|JPY|EUR|CNY|외화|달러|엔화|유로|현지|외국통화/i;

function amountScore(name: string): number {
  if (FOREIGN_AMOUNT.test(name) && !/원화|KRW/i.test(name)) return -1;
  if (/(이번\s*달|당월|이번\s*회차)/.test(name) && /청구/.test(name)) return 6;
  if (/원화|KRW|금액\s*\(\s*원\s*\)/i.test(name)) return 5;
  if (/청구금액|결제금액/.test(name)) return 4;
  if (/이용금액|거래금액|금액/.test(name)) return 3;
  return -1;
}

function dateFormat(value: string): string {
  if (/^\d{4}\.\d{1,2}\.\d{1,2}$/.test(value)) return "YYYY.MM.DD";
  if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(value)) return "YYYY/MM/DD";
  if (/^\d{8}$/.test(value)) return "YYYYMMDD";
  if (/^\d{1,2}\/\d{1,2}$/.test(value)) return "MM/DD";
  if (/^\d{4}년\s*\d{1,2}월\s*\d{1,2}일$/.test(value)) return "YYYY년 M월 D일";
  return "YYYY-MM-DD";
}

/** 데모 파일을 위한 결정론적 열 매핑. 원화 열이 없으면 정규화 단계에서 거부한다. */
export async function mapColumns(header: string[], sampleRows: string[][], _plan: Plan): Promise<ColumnMapping> {
  void _plan;
  const rows = [header, ...sampleRows].slice(0, 15);
  let bestIndex = 0;
  let bestScore = -1;
  for (const [index, row] of rows.entries()) {
    const score = Number(row.some((cell) => /이용일|거래일|날짜/.test(cell))) +
      Number(row.some((cell) => /가맹점|이용처|내용|적요/.test(cell))) +
      Number(row.some((cell) => /이용금액|청구금액|금액|원화|출금|입금/i.test(cell)));
    if (score > bestScore) { bestScore = score; bestIndex = index; }
  }

  const names = rows[bestIndex]?.map((cell) => cell.trim()) ?? [];
  const dateColumn = names.find((name) => /이용일|거래일|날짜/.test(name)) ?? "";
  const merchantColumn = names.find((name) => /가맹점|이용처/.test(name)) ??
    names.find((name) => /내용|적요/.test(name)) ?? "";
  const descriptionColumn = names.find((name) => name !== merchantColumn && /내용|적요|설명|상세/.test(name));
  const debitColumn = names.find((name) => /출금/.test(name) && !FOREIGN_AMOUNT.test(name));
  const creditColumn = names.find((name) => /입금/.test(name) && !FOREIGN_AMOUNT.test(name));
  const amountColumn = names.map((name) => ({ name, score: amountScore(name) }))
    .sort((a, b) => b.score - a.score)[0];
  const isSplit = Boolean(debitColumn && creditColumn);
  const isTransactions = Boolean(dateColumn && merchantColumn && (isSplit || names.some((name) => /금액|출금|입금/.test(name))));
  const isKrw = isTransactions && (isSplit || Boolean(amountColumn && amountColumn.score >= 0));
  const dateIndex = names.indexOf(dateColumn);
  const example = rows.slice(bestIndex + 1).map((row) => row[dateIndex]?.trim()).find(Boolean) ?? "";
  const format = dateFormat(example);
  const yearInTitle = rows.slice(0, bestIndex).flat().join(" ").match(/(?:19|20)\d{2}/)?.[0];
  return {
    isTransactions, isKrw, headerRowIndex: bestIndex,
    dateColumn, dateFormat: format,
    ...(format === "MM/DD" ? { assumedYear: yearInTitle ? Number(yearInTitle) : 2026 } : {}),
    merchantColumn,
    ...(descriptionColumn ? { descriptionColumn } : {}),
    amount: isSplit
      ? { mode: "split", debitColumn: debitColumn!, creditColumn: creditColumn! }
      : { mode: "single", column: amountColumn?.score !== undefined && amountColumn.score >= 0 ? amountColumn.name : "", debitIsNegative: false },
  };
}

const MERCHANT_RULES: { pattern: RegExp; category: Category }[] = [
  { pattern: /스타벅스|커피|카페|투썸|이디야/, category: "cafe" },
  { pattern: /배민|배달의민족|요기요|쿠팡이츠|식당|김밥|치킨/, category: "food" },
  { pattern: /넷플릭스|유튜브|멜론|스포티파이|디즈니/, category: "subscription" },
  { pattern: /마트|편의점|이마트|홈플러스|코스트코/, category: "groceries" },
  { pattern: /지하철|버스|택시|교통|카카오모빌리티/, category: "transport" },
  { pattern: /쿠팡|네이버쇼핑|11번가|무신사/, category: "shopping" },
  { pattern: /전기|가스|수도|통신|인터넷요금/, category: "utilities" },
  { pattern: /병원|약국|의원/, category: "health" },
  { pattern: /학원|교육|교보문고/, category: "education" },
  { pattern: /영화|CGV|메가박스|게임/, category: "entertainment" },
  { pattern: /호텔|항공|여행/, category: "travel" },
  { pattern: /월세|관리비/, category: "housing" },
  { pattern: /급여|월급/, category: "income" },
  { pattern: /이체|송금|카드대금/, category: "transfer" },
];

export async function classifyMerchants(merchants: string[], _plan: Plan): Promise<Record<string, Category>> {
  void _plan;
  return Object.fromEntries([...new Set(merchants)].map((merchant) => [
    merchant, MERCHANT_RULES.find(({ pattern }) => pattern.test(merchant))?.category ?? "other",
  ]));
}

export async function generateInsights(input: InsightInput): Promise<Insight[]> {
  const spend = input.summary.totalSpend;
  return [
    { title: "이번 분석 지출", body: `총지출은 ${spend.toLocaleString("ko-KR")}원입니다. 큰 지출 항목을 확인해 보세요.`, monthlySaving: Math.floor(spend * 0.05) },
    { title: "정기 결제 점검", body: `정기 결제 ${input.detections.recurringCount}건을 점검해 보세요.`, monthlySaving: Math.floor(spend * 0.02) },
    { title: "이상 거래 확인", body: `이상 거래 ${input.detections.anomalyCount}건을 확인하고 다음 달 계획에 반영해 보세요.`, monthlySaving: Math.floor(spend * 0.01) },
  ];
}
