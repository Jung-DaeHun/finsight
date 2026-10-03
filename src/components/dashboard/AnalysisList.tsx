import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { SectionHead } from "@/components/ui/SectionHead";
import { formatFullDate, formatMonthTitle, formatWon } from "@/lib/format";
import { ERROR_MESSAGES } from "@/messages/errors";
import type { AnalysisListItem } from "@/types";

export function AnalysisList({ items }: { items: AnalysisListItem[] }) {
  return <section aria-label="내 분석"><SectionHead title="내 분석" count={items.length} />
    <ul>{items.map((item) => {
      const title = item.status === "completed" ? item.periodTo ? formatMonthTitle(item.periodTo) : "분석 결과" : item.status === "failed" ? "분석 실패" : "분석 중";
      const content = <>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{title}</span>
          <span className="block break-all text-sm font-medium text-mute">{item.filenames.join(" · ")}</span>
          {item.status === "failed" && item.errorCode && <span className="mt-1 block text-xs text-sale">{ERROR_MESSAGES[item.errorCode]}</span>}
        </span>
        <span className="shrink-0 text-sm font-medium text-mute max-[860px]:hidden">{formatFullDate(item.createdAt)}</span>
        {item.status === "completed" && item.totalSpend !== undefined && <span className="shrink-0 text-right font-medium tabular-nums">{formatWon(item.totalSpend)}</span>}
        <Icon name="chevron-right" size={20} className="shrink-0" />
      </>;
      const classes = "flex w-full items-center gap-6 border-b border-hairline-soft py-5 text-left text-ink max-[600px]:gap-3";
      return <li key={item.id}>{item.status === "processing" ? <button type="button" disabled className={classes}>{content}</button> : <Link href={`/dashboard/analyses/${item.id}`} className={`${classes} hover:bg-soft-cloud`}>{content}</Link>}</li>;
    })}</ul>
  </section>;
}
