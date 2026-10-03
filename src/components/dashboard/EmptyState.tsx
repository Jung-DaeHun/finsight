import { Button } from "@/components/ui/Button";
export function EmptyState() {
  // 분석 0건일 때 아래 드롭존이 첫 화면에 함께 보이도록 낮은 가로 배치를 쓴다.
  return <section className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 bg-soft-cloud px-8 py-8 max-[600px]:px-5">
    <div className="flex min-w-0 flex-col gap-2">
      <h2 className="text-2xl font-medium leading-tight">첫 명세서를 올려 보세요</h2>
      <p className="max-w-[520px] text-mute">카드사·은행 앱에서 받은 CSV나 엑셀 파일이면 됩니다. 파일이 없다면 샘플 결과로 먼저 둘러보세요.</p>
    </div>
    <div className="flex flex-wrap gap-3"><Button href="#upload">파일 올리기</Button><Button href="/sample" variant="on-image">샘플 결과 보기</Button></div>
  </section>;
}
