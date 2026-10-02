// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSubscriptionSummary, upsertSubscription, userExists } from "./index";
import { DataError } from "@/types/errors";

const mocks = vi.hoisted(() => ({ from: vi.fn(), getUserById: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: mocks.from, auth: { admin: { getUserById: mocks.getUserById } } }) }));
const userId = "d74572bc-a02c-4b79-98c8-aeb62c08d7cf";
function query(result: { data?: unknown; error?: unknown } = {}) {
  const builder = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: null, error: null, ...result }).then(resolve),
  };
  mocks.from.mockReturnValueOnce(builder);
  return builder;
}
beforeEach(() => vi.resetAllMocks());
describe("서버 구독 저장·요약", () => {
  const subscription = { userId, polarSubscriptionId: "polar-sub", polarCustomerId: "polar-customer", status: "active", cancelAtPeriodEnd: true, currentPeriodEnd: "2026-10-29T00:00:00.000Z" };
  it("검증된 사용자 ID와 Polar 구독 ID로 멱등 저장한다", async () => {
    const q = query();
    await upsertSubscription(subscription);
    expect(mocks.from).toHaveBeenCalledWith("subscriptions");
    expect(q.upsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: userId, polar_subscription_id: "polar-sub", polar_customer_id: "polar-customer", status: "active",
      cancel_at_period_end: true, current_period_end: subscription.currentPeriodEnd, updated_at: expect.any(String),
    }), { onConflict: "polar_subscription_id" });
  });
  it("DB 실패 원문을 노출하지 않는다", async () => {
    query({ error: { message: "민감한 원문" } });
    await expect(upsertSubscription(subscription)).rejects.toEqual(new DataError("internal_error"));
  });
  it.each(["active", "trialing", "past_due"])("유효 구독 %s는 해지 예약 여부와 종료일을 담은 Pro 요약이다", async (status) => {
    const q = query({ data: { status, cancel_at_period_end: true, current_period_end: subscription.currentPeriodEnd, polar_customer_id: "secret" } });
    expect(await getSubscriptionSummary(userId)).toEqual({ plan: "pro", status, cancelAtPeriodEnd: true, currentPeriodEnd: subscription.currentPeriodEnd });
    expect(q.eq).toHaveBeenCalledWith("user_id", userId);
    expect(q.in).toHaveBeenCalledWith("status", ["active", "trialing", "past_due"]);
  });
  it("J6: revoked만 남으면 Free이고 null 종료일은 생략한다", async () => {
    query();
    const latest = query({ data: { status: "revoked", cancel_at_period_end: false, current_period_end: null } });
    expect(await getSubscriptionSummary(userId)).toEqual({ plan: "free", status: "revoked", cancelAtPeriodEnd: false });
    expect(latest.eq).toHaveBeenCalledWith("user_id", userId);
    expect(latest.order).toHaveBeenCalledWith("updated_at", { ascending: false });
  });
  it("구독 기록이 없으면 Free만 반환한다", async () => {
    query(); query();
    expect(await getSubscriptionSummary(userId)).toEqual({ plan: "free" });
  });
  it("새로 취소된 row가 있어도 다른 유효 구독을 우선한다", async () => {
    query({ data: { status: "active", cancel_at_period_end: false, current_period_end: subscription.currentPeriodEnd } });
    expect((await getSubscriptionSummary(userId)).plan).toBe("pro");
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });
  it("구독 조회 실패를 Free로 숨기지 않는다", async () => {
    query({ error: { message: "DB 실패" } });
    await expect(getSubscriptionSummary(userId)).rejects.toMatchObject({ code: "internal_error" });
  });
});
describe("웹훅 external ID의 실제 사용자 확인", () => {
  it("Auth 사용자 ID로 존재 여부를 확인한다", async () => {
    mocks.getUserById.mockResolvedValue({ data: { user: { id: userId } }, error: null });
    expect(await userExists(userId)).toBe(true);
    expect(mocks.getUserById).toHaveBeenCalledWith(userId);
  });
  it("없는 사용자는 false이다", async () => {
    mocks.getUserById.mockResolvedValue({ data: { user: null }, error: { status: 404 } });
    expect(await userExists(userId)).toBe(false);
  });
  it("FinSight 사용자 ID 형식이 아니면 DB 조회 없이 무시한다", async () => {
    expect(await userExists("unknown-external-id")).toBe(false);
    expect(mocks.getUserById).not.toHaveBeenCalled();
  });
  it("Auth 조회 장애를 없는 사용자로 처리하지 않는다", async () => {
    mocks.getUserById.mockResolvedValue({ data: { user: null }, error: { status: 500, message: "원문" } });
    await expect(userExists(userId)).rejects.toMatchObject({ code: "internal_error" });
  });
});
