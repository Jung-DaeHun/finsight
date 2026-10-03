"use client";
import { Button } from "@/components/ui/Button";
import { LockCard } from "@/components/ui/LockCard";
import { PageTitle } from "@/components/ui/PageTitle";
import type { AnalysisListItem, Plan } from "@/types";
import { AnalysisList } from "./AnalysisList";
import { EmptyState } from "./EmptyState";
import { UploadForm } from "./UploadForm";

export function Dashboard({ plan, used, limit, maxFiles, items }: {
  plan: Plan; used: number; limit: number; maxFiles: number; items: AnalysisListItem[];
}) {
  return <>
    <PageTitle title="대시보드" action={<div className="flex flex-wrap items-center gap-4">
      <div className="flex flex-wrap items-center gap-2.5 px-1">
        <span className="text-sm font-medium text-mute">이번 달 분석</span>
        <span className="font-medium tabular-nums">{used} / {limit}회</span>
        <progress aria-label="이번 달 분석 사용량" value={Math.min(used, limit)} max={limit} className="h-1 w-[72px] appearance-none bg-hairline-soft [&::-webkit-progress-bar]:bg-hairline-soft [&::-webkit-progress-value]:bg-ink [&::-moz-progress-bar]:bg-ink" />
      </div>
      {items.length > 0 && <Button href="#upload" icon="plus">새 분석</Button>}
    </div>} />
    {items.length === 0 ? <EmptyState /> : <>
      <AnalysisList items={items} />
      {plan === "free" && <div className="mt-6"><LockCard title="카드·계좌 여러 개를 한 번에" description="Pro는 분석당 파일 3개까지 합쳐 전체 지출과 월별 추이를 보여줍니다." /></div>}
    </>}
    <div className={items.length === 0 ? "mt-8" : "mt-12"}><UploadForm plan={plan} used={used} limit={limit} maxFiles={maxFiles} /></div>
  </>;
}
