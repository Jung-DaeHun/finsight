import { ResultView } from "@/components/dashboard/result/ResultView";
import { Button } from "@/components/ui/Button";
import { PublicHeader } from "@/components/ui/Headers";
import { getUserId } from "@/lib/auth";
import sample from "@/sample/analysis.json";
import type { AnalysisView } from "@/types";

export default async function SamplePage() {
  const userId = await getUserId();
  return <>
    <PublicHeader signedIn={userId !== null} />
    <main className="mx-auto max-w-[1440px] px-(--gutter) pt-8 pb-20">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 bg-ink px-5 py-3.5 text-sm font-medium text-on-primary">
        <p><strong>샘플 결과</strong> · 실제 명세서 예시로 만든 결과입니다. Pro 기능까지 모두 보여드립니다.</p>
        {userId ? <Button href="/dashboard" variant="on-image" size="sm">대시보드</Button>
          : <Button href="/signup" variant="on-image" size="sm">무료로 시작하기</Button>}
      </div>
      <ResultView view={sample as AnalysisView} mode="sample" />
    </main>
  </>;
}
