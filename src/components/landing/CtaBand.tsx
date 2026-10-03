import { Button } from "@/components/ui/Button";

export function CtaBand({ start }: { start: { href: string; label: string } }) {
  return <section aria-labelledby="cta-title" className="mt-24 bg-ink text-on-primary max-[600px]:mt-16">
    <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-6 gap-y-8 px-(--gutter) py-20 max-[600px]:py-14">
      <div className="flex flex-col gap-3">
        <h2 id="cta-title" className="font-heading text-[clamp(32px,4vw,52px)] leading-[1.08] font-bold tracking-[-0.02em] [text-wrap:balance]">이번 달 지출부터 정리하세요</h2>
        <p className="text-stone">명세서 파일 하나면 시작할 수 있습니다.</p>
      </div>
      <Button href={start.href} variant="on-image" className="max-[600px]:w-full">{start.label}</Button>
    </div>
  </section>;
}
