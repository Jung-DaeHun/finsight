import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { limits } from "@/lib/plan";
import type { Plan } from "@/types";

const INCLUDED = "포함";
const EXCLUDED = "미포함";

function Value({ value }: { value: string }) {
  if (value === INCLUDED) return <span className="inline-flex items-center gap-1.5"><Icon name="check" size={18} /><span className="sr-only">{INCLUDED}</span></span>;
  if (value === EXCLUDED) return <><span aria-hidden="true">—</span><span className="sr-only">{EXCLUDED}</span></>;
  return <>{value}</>;
}

/** plan이 null이면 비로그인 방문자다. */
export function Pricing({ start, plan }: { start: { href: string; label: string }; plan: Plan | null }) {
  const free = limits("free");
  const pro = limits("pro");
  const rows = [
    ["분석당 파일 수", `${free.maxFiles}개`, `최대 ${pro.maxFiles}개 (여러 카드·계좌 통합)`],
    ["카테고리 분류 · 차트 · 거래 목록", INCLUDED, INCLUDED],
    ["이번 분석 요약", INCLUDED, INCLUDED],
    ["정기결제 · 이상거래 탐지", "발견 건수만", "상세 목록"],
    ["월별 추이 · 전월 대비", EXCLUDED, INCLUDED],
    ["AI 인사이트 & 절약 조언", EXCLUDED, INCLUDED],
    ["월 분석 횟수", `${free.monthlyAnalyses}회`, `${pro.monthlyAnalyses}회`],
  ];
  return <section id="pricing" aria-labelledby="pricing-title" className="mx-auto flex max-w-[1440px] scroll-mt-24 flex-col gap-8 px-(--gutter) pt-24 pb-6 max-[600px]:pt-16">
    <div className="flex flex-col gap-3">
      <h2 id="pricing-title" className="font-heading text-[clamp(28px,3.2vw,40px)] leading-[1.15] font-bold tracking-[-0.02em]">요금제</h2>
      <p className="max-w-[600px] leading-[1.65] text-charcoal">Free는 결제 정보 없이 바로 시작할 수 있습니다. 여러 카드·계좌를 합쳐 보고 싶을 때 Pro로 바꾸세요.</p>
    </div>
    <div className="grid grid-cols-2 gap-2 max-[860px]:grid-cols-1">
      <div className="flex flex-col gap-4 bg-soft-cloud p-8 max-[600px]:p-6">
        <h3 className="text-lg font-bold">Free</h3>
        <p className="font-display text-[clamp(56px,6vw,88px)] leading-[0.9]">$0</p>
        <p className="text-charcoal">한 장의 명세서를 정리할 때</p>
        {/* soft-cloud 면 위에서 secondary(soft-cloud)는 버튼 경계가 사라지므로 흰 on-image를 쓴다. */}
        <Button href={start.href} variant="on-image" fullWidth className="mt-auto">{start.label}</Button>
      </div>
      <div className="flex flex-col gap-4 bg-ink p-8 text-on-primary max-[600px]:p-6">
        <h3 className="text-lg font-bold">Pro</h3>
        <p className="font-display text-[clamp(56px,6vw,88px)] leading-[0.9]">$9<span className="font-sans text-sm font-medium"> / 월</span></p>
        <p>여러 카드·계좌를 합쳐 새는 돈까지 찾을 때</p>
        {plan === null && <Button href="/signup" variant="on-image" fullWidth className="mt-auto">Pro 시작하기</Button>}
        {plan === "free" && <Button href="/api/checkout" variant="on-image" fullWidth className="mt-auto">Pro로 업그레이드</Button>}
        {plan === "pro" && <p className="mt-auto flex h-12 items-center justify-center gap-2 border border-on-primary/40 font-medium"><Icon name="check" size={18} />이용 중인 플랜입니다</p>}
      </div>
    </div>
    <div className="overflow-x-auto">
      <table aria-label="Free와 Pro 기능 비교" className="w-full table-fixed border-collapse text-left max-[600px]:text-sm">
        <colgroup><col className="w-[46%]" /><col className="w-[22%]" /><col className="w-[32%]" /></colgroup>
        <thead><tr>
          {["기능", "Free", "Pro"].map((label, index) => <th key={label} scope="col" className="border-b border-ink py-3.5 pr-3 font-bold">{index === 0 ? <span className="sr-only">{label}</span> : label}</th>)}
        </tr></thead>
        <tbody>{rows.map(([feature, freeValue, proValue]) => <tr key={feature}>
          <td className="border-b border-hairline-soft py-4 pr-3 align-top">{feature}</td>
          <td className="border-b border-hairline-soft py-4 pr-3 align-top text-mute"><Value value={freeValue} /></td>
          <td className="border-b border-hairline-soft py-4 pr-3 align-top font-medium"><Value value={proValue} /></td>
        </tr>)}</tbody>
      </table>
    </div>
    <p className="text-sm font-medium text-mute">월 분석 횟수는 성공한 분석 기준이며, 분석을 삭제해도 복구되지 않습니다. 원화(KRW) 명세서만 지원합니다.</p>
  </section>;
}
