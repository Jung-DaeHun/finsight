"use client";

import Link from "next/link";
import { useState } from "react";
import { formatMonthTitle } from "@/lib/format";
import type { AnalysisView, Category } from "@/types";
import { InsightsPanel } from "./InsightsPanel";
import { AnomalyPanel, CategoryPanel, KpiPanel, RecurringPanel, TopMerchantsPanel, TrendPanel } from "./Panels";
import { TransactionPanel } from "./TransactionPanel";
import { ResultContext } from "./result-context";

export function ResultView({ view, mode }: { view: AnalysisView; mode: "user" | "sample" }) {
  const [category, setCategory] = useState<Category | null>(null);
  const month = view.summary?.period.to ? formatMonthTitle(view.summary.period.to) : "이번 분석";
  return <ResultContext.Provider value={{ mode, category, setCategory }}>
    <nav aria-label="현재 위치" className="text-sm font-medium text-mute">
      <Link href={mode === "sample" ? "/" : "/dashboard"}>{mode === "sample" ? "홈" : "대시보드"}</Link>
      <span> / {month}</span>
    </nav>
    <div className="mt-2 mb-8 flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-[32px] leading-[1.2] font-medium">{month} 지출</h1>
      <p className="text-sm font-medium text-mute">거래 {view.summary?.transactionCount ?? 0}건</p>
    </div>
    <div className="grid grid-cols-4 gap-x-6 gap-y-8 max-[1100px]:grid-cols-2 [&>section]:col-span-2 [&>section]:min-w-0">
      <KpiPanel view={view} />
      <CategoryPanel view={view} />
      <TopMerchantsPanel view={view} />
      <TrendPanel view={view} />
      <InsightsPanel view={view} />
      <RecurringPanel view={view} />
      <AnomalyPanel view={view} />
      <TransactionPanel view={view} />
    </div>
  </ResultContext.Provider>;
}
