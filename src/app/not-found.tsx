import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return <main className="mx-auto max-w-220 px-(--gutter) py-20 text-center">
    <h1 className="text-[32px] font-medium">페이지를 찾을 수 없습니다</h1>
    <p className="mt-4 text-mute">주소를 확인하고 다시 시도해 주세요.</p>
    <div className="mt-8"><Button href="/dashboard">대시보드로 돌아가기</Button></div>
  </main>;
}
