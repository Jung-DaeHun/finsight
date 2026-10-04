import { Webhooks } from "@polar-sh/nextjs";
import type { NextRequest } from "next/server";
import { upsertSubscription, userExists } from "@/lib/data";
import { apiError } from "@/lib/api-error";
import { logError } from "@/lib/log";
import { getSubscription } from "@/services/polar";

type SubscriptionData = Parameters<NonNullable<Parameters<typeof Webhooks>[0]["onSubscriptionCreated"]>>[0]["data"];

async function syncSubscription({ type, data }: { type: string; data: SubscriptionData }): Promise<void> {
  const userId = data.customer.external_id;
  if (!userId || !await userExists(userId)) return;
  // 이벤트 순서가 바뀌거나 재시도돼도 payload 대신 Polar의 현재 상태를 저장한다.
  const current = await getSubscription(data.id);
  await upsertSubscription({
    userId, polarSubscriptionId: data.id, polarCustomerId: current.customerId,
    status: type === "subscription.revoked" ? "revoked" : current.status,
    cancelAtPeriodEnd: current.cancelAtPeriodEnd, currentPeriodEnd: current.currentPeriodEnd,
  });
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error("internal_error");
    const handler = Webhooks({
      webhookSecret,
      onSubscriptionCreated: syncSubscription,
      onSubscriptionUpdated: syncSubscription,
      onSubscriptionActive: syncSubscription,
      onSubscriptionCanceled: syncSubscription,
      onSubscriptionUncanceled: syncSubscription,
      onSubscriptionRevoked: syncSubscription,
    });
    // SDK가 서명을 검증한 뒤에만 위 콜백이 실행된다.
    const response = await handler(request);
    if (response.status === 403) return apiError("unauthorized", 403);
    return response;
  } catch {
    logError("polar_webhook_failed", { code: "internal_error" });
    return apiError("internal_error", 500);
  }
}
