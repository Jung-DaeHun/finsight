const steps = [
  { title: "파일 올리기", body: "카드사·은행 앱에서 받은 이용내역 파일을 그대로 올립니다." },
  { title: "분석 기다리기", body: "AI가 열을 읽고 거래를 분류합니다. 보통 1분 안에 끝납니다." },
  { title: "결과 확인", body: "카테고리, 상위 가맹점, 정기결제와 절약 포인트를 확인합니다." },
];

export function HowItWorks() {
  return <section aria-labelledby="steps-title" className="mx-auto flex max-w-[1440px] flex-col gap-6 px-(--gutter) pt-18 pb-6">
    <h2 id="steps-title" className="text-2xl leading-[1.2] font-medium">이용 방법</h2>
    <ol className="grid list-none grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-6">
      {steps.map((step, index) => <li key={step.title} className="flex flex-col gap-1.5 border-t-2 border-ink pt-4">
        <span className="font-display text-[56px] leading-[0.9]">{index + 1}</span>
        <h3 className="font-medium">{step.title}</h3>
        <p className="text-sm font-medium text-mute">{step.body}</p>
      </li>)}
    </ol>
  </section>;
}
