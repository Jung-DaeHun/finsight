import { Button } from "@/components/ui/Button";
export function EmptyState() {
  return <section className="flex flex-col items-center gap-3 bg-soft-cloud px-6 py-[72px] text-center">
    <h2 className="text-2xl font-medium leading-tight">첫 명세서를 올려 보세요</h2>
    <p className="max-w-[440px] text-mute">카드사·은행 앱에서 받은 CSV나 엑셀 파일이면 됩니다. 파일이 없다면 샘플 결과로 먼저 둘러보세요.</p>
    <div className="flex flex-wrap justify-center gap-3"><Button href="#upload">파일 올리기</Button><Button href="/sample" variant="secondary">샘플 결과 체험</Button></div>
  </section>;
}
