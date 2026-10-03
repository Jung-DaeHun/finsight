"use client";

import type { CSSProperties } from "react";
import { Badge } from "@/components/ui/Badge";
import { LockCard } from "@/components/ui/LockCard";
import { SectionHead } from "@/components/ui/SectionHead";
import { formatManWon, formatMonthTitle, formatShortDate, formatWon, periodDayCount } from "@/lib/format";
import type { AnalysisView, Category, Transaction } from "@/types";
import { CATEGORY_LABELS, useResultContext } from "./result-context";

const amountClass = "shrink-0 text-right font-medium tabular-nums";
const captionClass = "text-sm font-medium text-mute";
const tileClass = "flex min-w-0 flex-col gap-2 bg-soft-cloud p-5";
const numberClass = "font-display text-[32px] leading-none tracking-[0.01em] break-words";
const shades = ["bg-ink", "bg-charcoal", "bg-mute", "bg-stone", "bg-hairline"];
// Free에서 0건이면 "0건 발견" 잠금 카드 대신 이 캡션만 둔다. 업그레이드 유도는 추이·인사이트 잠금 카드에 맡긴다.
const notFound = "이번 분석에서는 발견되지 않았습니다.";

export function Delta({ view }: { view: AnalysisView }) {
  const comparison = view.trend?.comparison;
  if (!comparison) return <span className={captionClass}>전월 데이터 없음</span>;
  const { percent, delta } = comparison;
  const change = percent === null
    ? `${delta > 0 ? "+" : ""}${formatWon(delta)}`
    : `${percent > 0 ? "+" : ""}${percent.toFixed(1)}%`;
  return <span className={`text-sm font-medium ${delta < 0 ? "text-success" : "text-ink"}`}>전월 대비 {change}</span>;
}

/** 가맹점별 최근 정기결제 1건. 월을 걸친 명세서에서 같은 구독이 월 금액에 두 번 더해지지 않게 한다. */
function latestRecurring(view: AnalysisView): Transaction[] {
  const latest = new Map<string, Transaction>();
  for (const tx of view.detections?.items ?? []) {
    if (!tx.isRecurring) continue;
    const previous = latest.get(tx.merchant);
    if (!previous || previous.occurredOn < tx.occurredOn) latest.set(tx.merchant, tx);
  }
  return [...latest.values()];
}

export function KpiPanel({ view }: { view: AnalysisView }) {
  const summary = view.summary;
  const days = summary ? periodDayCount(summary.period.from, summary.period.to) : 0;
  const recurringSum = latestRecurring(view).reduce((sum, tx) => sum + tx.amount, 0);
  const detailed = !!view.detections && "items" in view.detections;
  return <>
    <div className={tileClass}><p className={captionClass}>총지출</p><p className={numberClass}>{formatWon(summary?.totalSpend ?? 0)}</p>
      {"trend" in view ? <Delta view={view} /> : <p className={captionClass}>{summary?.transactionCount ?? 0}건</p>}
    </div>
    <div className={tileClass}><p className={captionClass}>일평균</p><p className={numberClass}>{formatWon(days ? Math.round((summary?.totalSpend ?? 0) / days) : 0)}</p></div>
    <div className={tileClass}><p className={captionClass}>정기결제</p><p className={numberClass}>{view.detections?.recurringCount ?? 0}건</p>{(detailed || !!view.detections?.recurringCount) && <p className={captionClass}>{detailed ? `월 ${formatWon(recurringSum)}` : "상세는 Pro"}</p>}</div>
    <div className={tileClass}><p className={captionClass}>이상거래</p><p className={numberClass}>{view.detections?.anomalyCount ?? 0}건</p>{(detailed || !!view.detections?.anomalyCount) && <p className={captionClass}>{detailed ? "중복 결제 · 급증 탐지" : "상세는 Pro"}</p>}</div>
  </>;
}

export function CategoryPanel({ view }: { view: AnalysisView }) {
  const { category, setCategory } = useResultContext();
  const categories = Object.entries(view.summary?.byCategory ?? {}).map(([key, amount]) => ({ category: key as Category, amount }))
    .sort((a, b) => b.amount - a.amount);
  const max = categories[0]?.amount ?? 0;
  const total = view.summary?.totalSpend ?? 0;
  return <section aria-label="카테고리별 지출">
    <SectionHead title="카테고리별 지출" action={category && <button type="button" onClick={() => setCategory(null)} className="text-sm font-medium">필터 해제</button>} />
    {categories.length === 0 ? <p className={captionClass}>집계할 지출이 없습니다.</p> : <>
      <div aria-label="카테고리 비중" className="mb-3 flex h-2.5 w-full gap-0.5">
        {categories.map((item, i) => <span key={item.category} title={`${CATEGORY_LABELS[item.category]} ${total ? (item.amount / total * 100).toFixed(1) : "0.0"}%`}
          className={`block min-w-0 flex-[var(--share)] ${shades[Math.min(i, 4)]}`}
          style={{ "--share": item.amount } as CSSProperties} />)}
      </div>
      <div>{categories.map((item) => <button type="button" key={item.category} aria-pressed={category === item.category}
        onClick={() => setCategory(category === item.category ? null : item.category)}
        className={`grid w-full grid-cols-[96px_minmax(0,1fr)_96px_48px] items-center gap-3 py-[7px] text-left text-sm font-medium max-[600px]:grid-cols-[80px_minmax(0,1fr)_84px] ${category && category !== item.category ? "opacity-35" : ""}`}>
        <span className={category === item.category ? "font-bold" : ""}>{CATEGORY_LABELS[item.category]}</span>
        <span className="block h-2 bg-soft-cloud"><span className="block h-full w-[var(--bar-width)] bg-ink transition-[width] duration-300 ease-standard"
          style={{ "--bar-width": `${max ? item.amount / max * 100 : 0}%` } as CSSProperties} /></span>
        <span className={amountClass}>{formatWon(item.amount)}</span><span className="text-right text-mute tabular-nums max-[600px]:hidden">{total ? (item.amount / total * 100).toFixed(1) : "0.0"}%</span>
      </button>)}</div>
    </>}
  </section>;
}

export function TopMerchantsPanel({ view }: { view: AnalysisView }) {
  const merchants = view.summary?.topMerchants.slice(0, 5) ?? [];
  return <section aria-label="상위 가맹점"><SectionHead title="상위 가맹점" />
    {merchants.length === 0 ? <p className={captionClass}>집계할 지출이 없습니다.</p> : <ol>{merchants.map((item, i) =>
      <li key={item.merchant} className="flex items-center gap-3 border-b border-hairline-soft py-2.5 text-sm font-medium">
        <span className="w-5 shrink-0 text-mute">{i + 1}</span><span className="min-w-0 flex-1 break-words">{item.merchant}</span><span className={amountClass}>{formatWon(item.amount)}</span>
      </li>)}</ol>}
  </section>;
}

export function TrendPanel({ view }: { view: AnalysisView }) {
  const { mode } = useResultContext();
  const points = view.trend?.points.slice(-6) ?? [];
  const max = Math.max(0, ...points.map((point) => point.total));
  return <section aria-label="월별 추이"><SectionHead title="월별 추이" pro={mode === "sample"} />
    {!("trend" in view) ? <LockCard title="월별 추이 · 전월 대비" description="최근 6개월 지출 흐름을 Pro에서 볼 수 있습니다." /> : <>
      <div className="flex h-[180px] items-end gap-3">
        {points.map((point, i) => <div key={point.month} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
          <span className={`text-sm font-medium ${i === points.length - 1 ? "text-ink" : "text-mute"}`}>{formatManWon(point.total)}</span>
          <div role="img" aria-label={`${formatMonthTitle(point.month)} 지출 ${formatWon(point.total)}`}
            className={`block h-[var(--bar-height)] w-full max-w-12 shrink-0 ${i === points.length - 1 ? "bg-ink" : "bg-hairline"}`}
            style={{ "--bar-height": `${max ? point.total / max * 130 : 0}px` } as CSSProperties} />
          <span className={captionClass}>{Number(point.month.slice(5, 7))}월</span>
        </div>)}
      </div>
      {!view.trend?.comparison && <p className={`${captionClass} mt-3`}>전월 데이터 없음</p>}
      {points.length < 2 && <p className={`${captionClass} mt-2`}>다음 달 명세서를 올리면 추이가 보여요</p>}
    </>}
  </section>;
}

export function RecurringPanel({ view }: { view: AnalysisView }) {
  const { mode } = useResultContext();
  const latest = latestRecurring(view);
  const sum = latest.reduce((total, tx) => total + tx.amount, 0);
  return <section aria-label="정기결제"><SectionHead title="정기결제" pro={mode === "sample"} />
    {!view.detections || !("items" in view.detections) ? view.detections?.recurringCount
      ? <LockCard title="정기결제" teaser={`${view.detections.recurringCount}건 발견`} description="어떤 구독이 언제 빠져나가는지 상세 목록은 Pro에서 볼 수 있습니다." />
      : <p className={captionClass}>{notFound}</p> : <>
      <p className={`${captionClass} mb-2`}>{view.detections.recurringCount}건 · 월 {formatWon(sum)}</p>
      {latest.length === 0 ? <p className={captionClass}>발견된 정기결제가 없습니다.</p> : <ul>{latest.map((tx) =>
        <li key={tx.merchant} className="flex items-center gap-3 border-b border-hairline-soft py-2.5 text-sm font-medium">
          <div className="min-w-0 flex-1 break-words">{tx.merchant}<p className={captionClass}>최근 결제 {formatShortDate(tx.occurredOn)}</p></div><span className={amountClass}>{formatWon(tx.amount)}</span>
        </li>)}</ul>}
    </>}
  </section>;
}

export function AnomalyPanel({ view }: { view: AnalysisView }) {
  const { mode } = useResultContext();
  const anomalies = (view.detections?.items ?? []).filter((tx) => tx.anomalyType !== null);
  return <section aria-label="이상거래"><SectionHead title="이상거래" pro={mode === "sample"} />
    {!view.detections || !("items" in view.detections) ? view.detections?.anomalyCount
      ? <LockCard title="이상거래" teaser={`${view.detections.anomalyCount}건 발견`} description="중복 결제·지출 급증의 날짜, 가맹점, 금액을 Pro에서 확인하세요." />
      : <p className={captionClass}>{notFound}</p>
      : anomalies.length === 0 ? <p className={captionClass}>발견된 이상거래가 없습니다.</p> : <ul>{anomalies.map((tx, i) =>
        <li key={i} className="flex items-start gap-3 border-b border-hairline-soft py-2.5 text-sm font-medium max-[600px]:flex-wrap">
          <Badge>{tx.anomalyType === "duplicate" ? "중복 결제" : "급증"}</Badge>
          <div className="min-w-0 flex-1 break-words"><p className="font-bold">{tx.merchant}</p><p className={captionClass}>{formatShortDate(tx.occurredOn)} · {formatWon(tx.amount)}</p></div>
        </li>)}</ul>}
  </section>;
}
