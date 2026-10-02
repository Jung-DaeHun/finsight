import { notFound, redirect } from "next/navigation";
import { ResultView } from "@/components/dashboard/result/ResultView";
import { Button } from "@/components/ui/Button";
import { AppHeader } from "@/components/ui/Headers";
import { Spinner } from "@/components/ui/Spinner";
import { getUserId } from "@/lib/auth";
import { getAnalysisView, getUserPlan } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { ERROR_MESSAGES } from "@/messages/errors";

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const { id } = await params;
  const view = await getAnalysisView(userId, id);
  if (!view) notFound();
  const plan = await getUserPlan(userId);
  const { data } = await (await createClient()).auth.getClaims();
  const email = data?.claims.sub === userId && typeof data.claims.email === "string" ? data.claims.email : "";
  return <>
    <AppHeader plan={plan} email={email} active="dashboard" />
    <main className="mx-auto max-w-[1440px] px-(--gutter) pt-8 pb-20">
      {view.status === "completed" ? <ResultView key={view.id} view={view} mode="user" /> : <div className="mx-auto flex max-w-[600px] flex-col items-center gap-6 pt-16 text-center">
        {view.status === "processing" && <Spinner large label="분석 중" />}
        <h1 className="text-[32px] leading-[1.2] font-medium">{view.status === "processing" ? "분석 중" : "분석을 완료하지 못했습니다"}</h1>
        {view.status === "processing" ? <p className="text-mute">명세서를 분석하고 있습니다. 잠시 후 대시보드에서 결과를 확인해 주세요.</p>
          : <><p role="alert" className="text-sale">{ERROR_MESSAGES[view.errorCode ?? "internal_error"]}</p>{view.failedUpload && <p className="max-w-full text-sm text-mute break-words">{view.failedUpload.filename}</p>}</>}
        <Button href="/dashboard" variant="secondary" size="sm">대시보드로 돌아가기</Button>
      </div>}
    </main>
  </>;
}
