import { redirect } from "next/navigation";
import { AppHeader } from "@/components/ui/Headers";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { getUserId } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { countMonthlyUsage, getUserPlan, listAnalyses, recoverStaleAnalyses } from "@/lib/data";
import { limits } from "@/lib/plan";

export default async function DashboardPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  await recoverStaleAnalyses(userId);
  const [plan, used, items] = await Promise.all([
    getUserPlan(userId), countMonthlyUsage(userId), listAnalyses(userId),
  ]);
  const { monthlyAnalyses: limit, maxFiles } = limits(plan);
  const { data } = await (await createClient()).auth.getClaims();
  const email = data?.claims.sub === userId && typeof data.claims.email === "string" ? data.claims.email : "";
  return <>
    <AppHeader plan={plan} email={email} active="dashboard" />
    <main className="mx-auto max-w-[1440px] px-(--gutter) pt-8 pb-20">
      <Dashboard plan={plan} used={used} limit={limit} maxFiles={maxFiles} items={items} />
    </main>
  </>;
}
