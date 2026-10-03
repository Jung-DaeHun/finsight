import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolvePlan } from "@/lib/plan";
import type { Plan } from "@/types";
import { DataError } from "@/types/errors";

// userId는 검증된 claims.sub 또는 서명 검증 후 존재를 확인한 Polar external ID이다.
export async function upsertSubscription(input: {
  userId: string;
  polarSubscriptionId: string;
  polarCustomerId: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
}): Promise<void> {
  const { error } = await createAdminClient().from("subscriptions").upsert({
    user_id: input.userId,
    polar_subscription_id: input.polarSubscriptionId,
    polar_customer_id: input.polarCustomerId,
    status: input.status,
    cancel_at_period_end: input.cancelAtPeriodEnd,
    current_period_end: input.currentPeriodEnd,
    updated_at: new Date().toISOString(),
  }, { onConflict: "polar_subscription_id" });
  if (error) throw new DataError("internal_error");
}

export async function userExists(userId: string): Promise<boolean> {
  if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(userId)) return false;
  const { data, error } = await createAdminClient().auth.admin.getUserById(userId);
  if (error?.status === 404) return false;
  if (error) throw new DataError("internal_error");
  return data.user?.id === userId;
}

export async function getSubscriptionSummary(userId: string): Promise<{
  plan: Plan;
  status?: string;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string;
}> {
  const admin = createAdminClient();
  const select = () => admin.from("subscriptions")
    .select("status,cancel_at_period_end,current_period_end")
    .eq("user_id", userId);
  const active = await select().in("status", ["active", "trialing", "past_due"])
    .order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (active.error) throw new DataError("internal_error");
  // getUserPlan과 동일하게 유효 구독을 우선하고, 없을 때만 마지막 상태를 보여준다.
  const latest = active.data ? active : await select()
    .order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (latest.error) throw new DataError("internal_error");
  if (!latest.data) return { plan: "free" };
  const sub = {
    status: latest.data.status,
    cancelAtPeriodEnd: latest.data.cancel_at_period_end,
    currentPeriodEnd: latest.data.current_period_end,
  };
  return {
    plan: resolvePlan(sub), status: sub.status, cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    ...(sub.currentPeriodEnd ? { currentPeriodEnd: sub.currentPeriodEnd } : {}),
  };
}
