import { redirect } from "next/navigation";
import { AppHeader } from "@/components/ui/Headers";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { CheckoutStatus } from "@/components/dashboard/CheckoutStatus";
import { getUserId } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { countMonthlyUsage, getUserPlan, listAnalyses } from "@/lib/data";
import { limits } from "@/lib/plan";

export default async function DashboardPage({ searchParams }: {
  searchParams?: Promise<{ checkout?: string | string[] }>;
} = {}) {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  // 정체 분석 복구는 listAnalyses가 목록 조회 전에 수행한다.
  const [plan, used, items] = await Promise.all([
    getUserPlan(userId), countMonthlyUsage(userId), listAnalyses(userId),
  ]);
  const { monthlyAnalyses: limit, maxFiles } = limits(plan);
  const { data } = await (await createClient()).auth.getClaims();
  const email = data?.claims.sub === userId && typeof data.claims.email === "string" ? data.claims.email : "";
  const checkoutSuccess = (await searchParams)?.checkout === "success";
  return <>
    <AppHeader plan={plan} email={email} active="dashboard" />
    <main className="mx-auto max-w-[1440px] px-(--gutter) pt-8 pb-20">
      {checkoutSuccess && <CheckoutStatus plan={plan} />}
      <Dashboard plan={plan} used={used} limit={limit} maxFiles={maxFiles} items={items} />
    </main>
  </>;
}
