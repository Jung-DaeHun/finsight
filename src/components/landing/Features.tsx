import { Icon, type IconName } from "@/components/ui/Icon";
import { limits } from "@/lib/plan";

export function Features() {
  const features: { icon: IconName; title: string; body: string }[] = [
    { icon: "file-spreadsheet", title: "어떤 명세서든", body: "CSV, xlsx, xls(HTML 표 포함), EUC-KR까지. 날짜·금액·가맹점 열을 AI가 알아서 찾습니다." },
    { icon: "pie-chart", title: "카테고리별 정리", body: "식비, 쇼핑, 구독 등으로 분류하고 총지출, 상위 가맹점, 비중을 한 화면에 보여줍니다." },
    { icon: "repeat", title: "새는 돈 찾기", body: "잊고 있던 정기결제, 같은 금액 중복 결제, 갑자기 늘어난 지출을 찾아냅니다." },
    { icon: "layers", title: "여러 카드 한 번에", body: `Pro는 카드·계좌 파일 ${limits("pro").maxFiles}개를 합쳐 전체 지출을 한 번에 봅니다.` },
  ];
  return <section id="features" aria-labelledby="features-title" className="mx-auto flex max-w-[1440px] scroll-mt-24 flex-col gap-8 px-(--gutter) pt-24 pb-6 max-[600px]:pt-16">
    <div className="flex flex-col gap-3">
      <h2 id="features-title" className="font-heading text-[clamp(28px,3.2vw,40px)] leading-[1.15] font-bold tracking-[-0.02em]">형식은 신경 쓰지 마세요</h2>
      <p className="max-w-[600px] leading-[1.65] text-charcoal">카드사·은행 앱에서 내려받은 파일을 고치지 않고 그대로 올리면 됩니다.</p>
    </div>
    <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-2">
      {features.map((feature) => <div key={feature.title} className="flex flex-col gap-3 bg-soft-cloud p-7 max-[600px]:p-6">
        <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-[18px] bg-canvas"><Icon name={feature.icon} size={22} /></div>
        <h3 className="text-lg leading-[1.4] font-bold">{feature.title}</h3>
        <p className="leading-[1.65] text-charcoal">{feature.body}</p>
      </div>)}
    </div>
  </section>;
}
