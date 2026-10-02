// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Webhooks } from "@polar-sh/nextjs";
import { resolvePlan } from "@/lib/plan";
import { POST } from "./route";
const mocks = vi.hoisted(() => ({ userExists: vi.fn(), upsertSubscription: vi.fn(), logError: vi.fn(), type: "subscription.active", externalId: "owner" as string | null }));
vi.mock("@/lib/data", () => ({ userExists: mocks.userExists, upsertSubscription: mocks.upsertSubscription }));
vi.mock("@/lib/log", () => ({ logError: mocks.logError }));
vi.mock("@polar-sh/nextjs", async () => {
  // Node의 ESM에서 어댑터의 next/server 확장자 없는 import를 피한다.
  const { createRequire } = await import("node:module");
  const actual = createRequire(import.meta.url)("@polar-sh/nextjs") as typeof import("@polar-sh/nextjs");
  return { Webhooks: vi.fn((config: Parameters<typeof actual.Webhooks>[0]) => async (request: NextRequest) => {
    // 잘못된 서명은 실제 어댑터로 확인하고, 검증 후 이벤트 처리만 모의한다.
    if (request.headers.get("webhook-signature") !== "verified-test-event") return actual.Webhooks(config)(request);
    const names = { "subscription.created": "onSubscriptionCreated", "subscription.updated": "onSubscriptionUpdated", "subscription.active": "onSubscriptionActive", "subscription.canceled": "onSubscriptionCanceled", "subscription.uncanceled": "onSubscriptionUncanceled", "subscription.revoked": "onSubscriptionRevoked" } as const;
    const handler = config[names[mocks.type as keyof typeof names]] as ((payload: unknown) => Promise<void>) | undefined;
    const payload = { type: mocks.type, data: { id: "polar-sub", customerId: "polar-customer", customer: { externalId: mocks.externalId }, status: "active", cancelAtPeriodEnd: true, currentPeriodEnd: new Date("2026-10-29T00:00:00Z") } };
    if (handler) await handler(payload);
    return Response.json({ received: true });
  }) };
});
function request(signature = "verified-test-event") { return new NextRequest("https://finsight.example/api/webhooks/polar", { method: "POST", headers: { "webhook-id": "event", "webhook-timestamp": String(Math.floor(Date.now() / 1000)), "webhook-signature": signature }, body: JSON.stringify({ type: "subscription.active", data: { customer: { external_id: "owner" } } }) }); }
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("POLAR_WEBHOOK_SECRET", "test-webhook-secret");
  mocks.type = "subscription.active"; mocks.externalId = "owner";
  mocks.userExists.mockResolvedValue(true); mocks.upsertSubscription.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllEnvs());
it("실제 어댑터가 서명 불일치를 403으로 거절하며 본문 사용자 ID를 조회하지 않는다", async () => {
  const response = await POST(request("v1,invalid"));
  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ error: { code: "unauthorized" } });
  expect(mocks.userExists).not.toHaveBeenCalled();
  expect(mocks.upsertSubscription).not.toHaveBeenCalled();
});
it.each(["created", "updated", "active", "canceled", "uncanceled", "revoked"])("서명 검증 이후 subscription.%s를 저장한다", async (event) => {
  mocks.type = `subscription.${event}`;
  expect((await POST(request())).status).toBe(200);
  expect(vi.mocked(Webhooks).mock.calls[0][0].webhookSecret).toBe("test-webhook-secret");
  expect(mocks.userExists).toHaveBeenCalledWith("owner");
  expect(mocks.upsertSubscription).toHaveBeenCalledWith({ userId: "owner", polarSubscriptionId: "polar-sub", polarCustomerId: "polar-customer", status: event === "revoked" ? "revoked" : "active", cancelAtPeriodEnd: true, currentPeriodEnd: "2026-10-29T00:00:00.000Z" });
  expect(mocks.userExists.mock.invocationCallOrder[0]).toBeLessThan(mocks.upsertSubscription.mock.invocationCallOrder[0]);
});
it("없는 사용자면 200으로 무시한다", async () => {
  mocks.userExists.mockResolvedValue(false);
  expect((await POST(request())).status).toBe(200);
  expect(mocks.upsertSubscription).not.toHaveBeenCalled();
});
it("external ID가 없으면 사용자 조회 없이 200이다", async () => {
  mocks.externalId = null;
  expect((await POST(request())).status).toBe(200);
  expect(mocks.userExists).not.toHaveBeenCalled();
});
it.each(["userExists", "upsertSubscription"] as const)("%s DB 실패는 재시도를 위한 500이다", async (operation) => {
  mocks[operation].mockRejectedValue(new Error("원문"));
  const response = await POST(request());
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: { code: "internal_error" } });
});
it("revoked는 SDK status가 active여도 Free로 판정한다", async () => {
  mocks.type = "subscription.revoked";
  await POST(request());
  expect(resolvePlan(mocks.upsertSubscription.mock.calls[0][0])).toBe("free");
});
it("secret이 없으면 검증을 생략하지 않고 500이다", async () => {
  vi.stubEnv("POLAR_WEBHOOK_SECRET", "");
  expect((await POST(request())).status).toBe(500);
  expect(Webhooks).not.toHaveBeenCalled();
  expect(mocks.upsertSubscription).not.toHaveBeenCalled();
});
