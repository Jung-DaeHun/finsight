import { redirect } from "next/navigation";
import { AppHeader } from "@/components/ui/Headers";
import { Settings } from "@/components/dashboard/settings/Settings";
import { getUserId } from "@/lib/auth";
import { countMonthlyUsage, getSubscriptionSummary, listAnalyses } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  // listAnalyses는 목록을 읽기 전에 본인의 정체 분석도 복구한다.
  const [subscription, used, items] = await Promise.all([
    getSubscriptionSummary(userId), countMonthlyUsage(userId), listAnalyses(userId),
  ]);
  const { data, error } = await (await createClient()).auth.getClaims();
  const email = !error && data?.claims.sub === userId && typeof data.claims.email === "string" ? data.claims.email : "";
  return <>
    <AppHeader active="settings" plan={subscription.plan} email={email} />
    <main className="mx-auto max-w-[880px] px-(--gutter) pt-8 pb-20">
      <Settings subscription={subscription} used={used} items={items} email={email} />
    </main>
  </>;
}
