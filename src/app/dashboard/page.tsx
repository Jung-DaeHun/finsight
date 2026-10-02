import { redirect } from "next/navigation";
import { AppHeader } from "@/components/ui/Headers";
import { PageTitle } from "@/components/ui/PageTitle";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan, recoverStaleAnalyses } from "@/lib/data";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (error || typeof userId !== "string" || !userId) redirect("/login");
  await recoverStaleAnalyses(userId);
  const plan = await getUserPlan(userId);
  const email = typeof data?.claims.email === "string" ? data.claims.email : "";
  return <>
    <AppHeader plan={plan} email={email} active="dashboard" />
    <main className="mx-auto max-w-[1440px] px-(--gutter) pt-8 pb-20"><PageTitle title="대시보드" /></main>
  </>;
}
