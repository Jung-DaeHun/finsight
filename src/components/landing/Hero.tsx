import type { CSSProperties } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { formatMonthTitle, formatWon } from "@/lib/format";
import sample from "@/sample/analysis.json";
import type { Category } from "@/types";

const categoryLabels: Record<Category, string> = {
  food: "식비", cafe: "카페·간식", groceries: "생활·마트", transport: "교통",
  shopping: "쇼핑", subscription: "구독·디지털", utilities: "통신·공과금",
  housing: "주거", health: "의료", education: "교육", entertainment: "문화·여가",
  travel: "여행", transfer: "이체", income: "수입", other: "기타",
};
const shades = ["bg-ink", "bg-charcoal", "bg-mute", "bg-stone", "bg-hairline"];

export function Hero({ startHref }: { startHref: string }) {
  const { summary, detections } = sample;
  const categories = Object.entries(summary.byCategory)
    .map(([category, amount]) => ({ name: categoryLabels[category as Category], amount }))
    .sort((a, b) => b.amount - a.amount);
  return <section aria-labelledby="hero-title" className="mx-auto grid max-w-[1440px] grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-12 px-(--gutter) py-18 max-[860px]:grid-cols-1 max-[860px]:pt-10">
    <div className="flex min-w-0 flex-col gap-6">
      <h1 id="hero-title" className="font-heading text-[clamp(40px,5.6vw,76px)] leading-[1.08] font-bold tracking-[-0.02em] [text-wrap:pretty]">명세서를 올리면<br />지출이 정리됩니다</h1>
      <p className="max-w-[520px] text-lg leading-[1.6] text-charcoal">카드 명세서·은행 거래내역(CSV·엑셀)을 그대로 올리세요. 카드사마다 다른 형식은 AI가 읽고, 카테고리 분류와 요약, 새는 돈까지 찾아 드립니다.</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button href={startHref}>무료로 시작하기</Button>
        <Button href="/sample" variant="secondary">샘플 결과 보기</Button>
      </div>
    </div>
    <div role="region" aria-label="샘플 분석 미리보기" className="flex aspect-[5/4] min-w-0 items-center justify-center bg-soft-cloud p-12 max-[1100px]:p-6 max-[600px]:p-5">
      <div className="flex w-full max-w-[440px] min-w-0 flex-col gap-4 bg-canvas p-7 max-[1100px]:p-5">
        <p className="text-sm font-medium text-mute">{formatMonthTitle(summary.period.to)} · 신한카드 + KB국민은행</p>
        <p className="font-display text-[clamp(56px,6vw,88px)] leading-[0.9]">{formatWon(summary.totalSpend)}</p>
        <div role="img" aria-label="카테고리 비중" className="flex h-2.5 w-full gap-0.5">
          {categories.map((item, index) => <span key={item.name}
            title={`${item.name} ${(item.amount / summary.totalSpend * 100).toFixed(1)}%`}
            className={`block min-w-0 flex-[var(--share)] ${shades[Math.min(index, shades.length - 1)]}`}
            style={{ "--share": item.amount } as CSSProperties} />)}
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          {categories.slice(0, 4).map((item) => <div key={item.name}>
            <dt className="text-sm font-medium text-mute">{item.name}</dt>
            <dd className="font-medium tabular-nums">{formatWon(item.amount)}</dd>
          </div>)}
        </dl>
        <p className="flex items-center gap-2 border-t border-hairline-soft pt-3 text-sm font-medium">
          <Icon name="repeat" size={16} className="shrink-0" />
          <span>정기결제 {detections.recurringCount}건 · 이상거래 {detections.anomalyCount}건 발견</span>
        </p>
      </div>
    </div>
  </section>;
}
