import type { CSSProperties } from "react";
import { Badge } from "@/components/ui/Badge";
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
// 신뢰 문구는 확인된 사실만 쓴다(UX_GUIDE 3.1): private 버킷 저장, 삭제·탈퇴 시 Storage 삭제(services/deletion).
const trust = [
  "카드사·은행 로그인 없이 내려받은 파일만 올립니다",
  "원본 파일은 본인만 접근할 수 있는 비공개 저장소에 둡니다",
  "분석을 삭제하거나 탈퇴하면 원본 파일도 함께 삭제됩니다",
];

export function Hero({ start }: { start: { href: string; label: string } }) {
  const { summary, detections } = sample;
  const categories = Object.entries(summary.byCategory)
    .map(([category, amount]) => ({ name: categoryLabels[category as Category], amount }))
    .sort((a, b) => b.amount - a.amount);
  const shade = (index: number) => shades[Math.min(index, shades.length - 1)];
  return <section aria-labelledby="hero-title" className="mx-auto grid max-w-[1440px] grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-12 px-(--gutter) pt-16 pb-16 max-[860px]:grid-cols-1 max-[860px]:gap-10 max-[860px]:pt-10 max-[860px]:pb-16">
    <div className="flex min-w-0 flex-col gap-6">
      <h1 id="hero-title" className="font-heading text-[clamp(40px,5.6vw,76px)] leading-[1.08] font-bold tracking-[-0.02em] [text-wrap:balance]">명세서를 올리면<br />지출이 정리됩니다</h1>
      <p className="max-w-[520px] text-lg leading-[1.65] text-charcoal">카드 명세서·은행 거래내역(CSV·엑셀)을 그대로 올리세요. 카드사마다 다른 형식은 AI가 읽고, 카테고리 분류와 요약, 새는 돈까지 찾아 드립니다.</p>
      <div className="flex flex-wrap items-center gap-2 max-[600px]:flex-col max-[600px]:items-stretch">
        <Button href={start.href}>{start.label}</Button>
        <Button href="/sample" variant="secondary">샘플 결과 보기</Button>
      </div>
      <ul aria-label="파일 보관 안내" className="flex max-w-[520px] list-none flex-col gap-2.5 border-t border-hairline-soft pt-5 text-sm font-medium text-charcoal">
        {trust.map((item) => <li key={item} className="flex items-start gap-2.5">
          <Icon name="check" size={16} className="mt-0.5 shrink-0" />{item}
        </li>)}
      </ul>
    </div>
    <div role="region" aria-label="샘플 분석 미리보기" className="flex aspect-[5/4] min-w-0 items-center justify-center bg-soft-cloud p-12 max-[1100px]:p-6 max-[600px]:aspect-auto max-[600px]:p-4">
      <div className="flex w-full max-w-[440px] min-w-0 flex-col gap-5 bg-canvas p-7 max-[1100px]:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-mute">{formatMonthTitle(summary.period.to)} · 신한카드 + KB국민은행</p>
          <Badge>샘플</Badge>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-mute">총지출</p>
          <p className="font-display text-[clamp(56px,6vw,88px)] leading-[0.9]">{formatWon(summary.totalSpend)}</p>
        </div>
        <div role="img" aria-label="카테고리 비중" className="flex h-2.5 w-full gap-0.5">
          {categories.map((item, index) => <span key={item.name}
            title={`${item.name} ${(item.amount / summary.totalSpend * 100).toFixed(1)}%`}
            className={`block min-w-0 flex-[var(--share)] ${shade(index)}`}
            style={{ "--share": item.amount } as CSSProperties} />)}
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5">
          {categories.slice(0, 4).map((item, index) => <div key={item.name}>
            <dt className="flex items-center gap-1.5 text-sm font-medium text-mute">
              <span data-swatch aria-hidden="true" className={`block size-2 shrink-0 ${shade(index)}`} />{item.name}
            </dt>
            <dd className="font-medium tabular-nums">{formatWon(item.amount)}</dd>
          </div>)}
        </dl>
        <p className="flex items-center gap-2 border-t border-hairline-soft pt-3.5 text-sm font-medium">
          <Icon name="repeat" size={16} className="shrink-0" />
          <span>정기결제 {detections.recurringCount}건 · 이상거래 {detections.anomalyCount}건 발견</span>
        </p>
      </div>
    </div>
  </section>;
}
