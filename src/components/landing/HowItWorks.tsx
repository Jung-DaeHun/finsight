const steps = [
  { title: "파일 올리기", body: "카드사·은행 앱에서 받은 이용내역 파일을 그대로 올립니다." },
  // 분석 중 화면(Analyzing)의 안내와 같은 기대치를 말한다(UX_GUIDE 2.3).
  { title: "분석 기다리기", body: "AI가 열을 읽고 거래를 분류합니다. 보통 1분 안에 끝나고, 파일 3개는 최대 4분까지 걸릴 수 있습니다." },
  { title: "결과 확인", body: "카테고리, 상위 가맹점, 정기결제와 절약 포인트를 확인합니다." },
];

export function HowItWorks() {
  return <section aria-labelledby="steps-title" className="mx-auto flex max-w-[1440px] flex-col gap-8 px-(--gutter) pt-24 pb-6 max-[600px]:pt-16">
    <h2 id="steps-title" className="font-heading text-[clamp(28px,3.2vw,40px)] leading-[1.15] font-bold tracking-[-0.02em]">이용 방법</h2>
    <ol className="grid list-none grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-6 gap-y-10">
      {steps.map((step, index) => <li key={step.title} className="flex flex-col gap-2 border-t-2 border-ink pt-5">
        <span className="font-display text-[64px] leading-[0.9]">{index + 1}</span>
        <h3 className="mt-2 text-lg leading-[1.4] font-bold">{step.title}</h3>
        <p className="max-w-[360px] leading-[1.65] text-charcoal">{step.body}</p>
      </li>)}
    </ol>
  </section>;
}
