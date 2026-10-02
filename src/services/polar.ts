import "server-only";
import { Polar } from "@polar-sh/sdk";
import { upsertSubscription } from "@/lib/data";
import { isMocked } from "@/lib/mock";
import { PolarServiceError } from "@/types/errors";

function polarClient(): Polar {
  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  const server = process.env.POLAR_SERVER ?? "production";
  if (!accessToken || (server !== "production" && server !== "sandbox")) throw new PolarServiceError();
  return new Polar({ accessToken, server, timeoutMs: 30_000 });
}

function appUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (!base) throw new PolarServiceError();
  return new URL(path, base).toString();
}

function isMissingCustomer(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("statusCode" in error)) return false;
  if (error.statusCode === 404) return true;
  if (error.statusCode !== 422 || !("detail" in error) || !Array.isArray(error.detail)) return false;
  return error.detail.some((detail: unknown) => {
    if (!detail || typeof detail !== "object" || !("loc" in detail) || !Array.isArray(detail.loc) || !("msg" in detail)) return false;
    return detail.loc.length === 2 && detail.loc[0] === "body" && detail.loc[1] === "external_customer_id"
      && detail.msg === "Customer does not exist.";
  });
}

async function saveMockSubscription(userId: string, status: "active" | "canceled"): Promise<void> {
  await upsertSubscription({
    userId, polarSubscriptionId: `mock_${userId}`, polarCustomerId: `mock_${userId}`,
    status, cancelAtPeriodEnd: false, currentPeriodEnd: null,
  });
}

export async function createCheckout(userId: string, email: string): Promise<string> {
  try {
    const successUrl = appUrl("/dashboard?checkout=success");
    if (isMocked("polar")) {
      await saveMockSubscription(userId, "active");
      return successUrl;
    }
    const product = process.env.POLAR_PRO_PRODUCT_ID;
    if (!product) throw new PolarServiceError();
    const checkout = await polarClient().checkouts.create({
      products: [product], externalCustomerId: userId, customerEmail: email, successUrl,
    });
    return checkout.url;
  } catch {
    throw new PolarServiceError();
  }
}

export async function createPortalUrl(userId: string): Promise<string | null> {
  try {
    if (isMocked("polar")) return appUrl("/settings");
    const session = await polarClient().customerSessions.create({ externalCustomerId: userId });
    return session.customerPortalUrl;
  } catch (error) {
    if (isMissingCustomer(error)) return null;
    throw new PolarServiceError();
  }
}

export async function cancelSubscriptions(userId: string): Promise<void> {
  try {
    if (isMocked("polar")) {
      await saveMockSubscription(userId, "canceled");
      return;
    }
    const polar = polarClient();
    const billableIds = async (): Promise<string[]> => {
      const pages = await polar.subscriptions.list({ externalCustomerId: userId, limit: 100 });
      const ids: string[] = [];
      for await (const page of pages) {
        for (const sub of page.result.items) {
          if (!sub.endedAt && !["canceled", "revoked", "incomplete_expired"].includes(sub.status)) ids.push(sub.id);
        }
      }
      return ids;
    };
    // 삭제로 페이지가 줄어들어 빠지는 구독이 없도록 전체 ID를 먼저 수집한다.
    const ids = await billableIds();
    for (const id of ids) {
      try {
        await polar.subscriptions.revoke({ id });
      } catch {
        // 동시 취소·응답 유실도 재조회에서 종료가 확인되어야만 성공한다.
      }
    }
    if ((await billableIds()).length > 0) throw new PolarServiceError("subscription_cancel_failed");
  } catch {
    throw new PolarServiceError("subscription_cancel_failed");
  }
}
