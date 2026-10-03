import { Button } from "@/components/ui/Button";

export function CtaBand({ startHref }: { startHref: string }) {
  return <section aria-labelledby="cta-title" className="mt-18 bg-ink text-on-primary">
    <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-6 px-(--gutter) py-16">
      <h2 id="cta-title" className="font-heading text-[clamp(32px,4vw,52px)] leading-[1.08] font-bold tracking-[-0.02em] [text-wrap:pretty]">이번 달 지출부터 정리하세요</h2>
      <Button href={startHref} variant="on-image">무료로 시작하기</Button>
    </div>
  </section>;
}
