import { Button } from "@/components/ui/Button";
import { limits } from "@/lib/plan";

export function Pricing({ startHref }: { startHref: string }) {
  const free = limits("free");
  const pro = limits("pro");
  const rows = [
    ["분석당 파일 수", `${free.maxFiles}개`, `최대 ${pro.maxFiles}개 (여러 카드·계좌 통합)`],
    ["카테고리 분류 · 차트 · 거래 목록", "포함", "포함"],
    ["이번 분석 요약", "포함", "포함"],
    ["정기결제 · 이상거래 탐지", "발견 건수만", "상세 목록"],
    ["월별 추이 · 전월 대비", "—", "포함"],
    ["AI 인사이트 & 절약 조언", "—", "포함"],
    ["월 분석 횟수", `${free.monthlyAnalyses}회`, `${pro.monthlyAnalyses}회`],
  ];
  return <section id="pricing" aria-labelledby="pricing-title" className="mx-auto flex max-w-[1440px] scroll-mt-24 flex-col gap-6 px-(--gutter) pt-18 pb-6">
    <h2 id="pricing-title" className="text-2xl leading-[1.2] font-medium">요금제</h2>
    <div className="grid grid-cols-2 gap-2 max-[860px]:grid-cols-1">
      <div className="flex flex-col gap-3 bg-soft-cloud p-8">
        <h3 className="font-medium">Free</h3>
        <p className="font-display text-[clamp(56px,6vw,88px)] leading-[0.9]">$0</p>
        <p className="text-mute">한 장의 명세서를 정리할 때</p>
        <Button href={startHref} variant="secondary" fullWidth>무료로 시작하기</Button>
      </div>
      <div className="flex flex-col gap-3 bg-ink p-8 text-on-primary">
        <h3 className="font-medium">Pro</h3>
        <p className="font-display text-[clamp(56px,6vw,88px)] leading-[0.9]">$9<span className="font-sans text-sm font-medium"> / 월</span></p>
        <p>여러 카드·계좌를 합쳐 새는 돈까지 찾을 때</p>
        <Button href={startHref} variant="on-image" fullWidth>Pro 시작하기</Button>
      </div>
    </div>
    <div className="overflow-x-auto">
      <table aria-label="Free와 Pro 기능 비교" className="w-full min-w-[560px] border-collapse text-left">
        <thead><tr>
          {["기능", "Free", "Pro"].map((label, index) => <th key={label} scope="col" className="border-b border-ink py-3.5 pr-3 font-medium">{index === 0 ? <span className="sr-only">{label}</span> : label}</th>)}
        </tr></thead>
        <tbody>{rows.map(([feature, freeValue, proValue]) => <tr key={feature}>
          <td className="border-b border-hairline-soft py-3.5 pr-3 align-top">{feature}</td>
          <td className="border-b border-hairline-soft py-3.5 pr-3 align-top text-mute">{freeValue}</td>
          <td className="border-b border-hairline-soft py-3.5 pr-3 align-top">{proValue}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <p className="text-sm font-medium text-mute">월 분석 횟수는 성공한 분석 기준이며, 분석을 삭제해도 복구되지 않습니다. 원화(KRW) 명세서만 지원합니다.</p>
  </section>;
}
