// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cancelSubscriptions, createCheckout, createPortalUrl, getSubscription } from "./polar";
import { PolarServiceError } from "@/types/errors";

const mocks = vi.hoisted(() => ({ Polar: vi.fn(), checkout: vi.fn(), portal: vi.fn(), list: vi.fn(), revoke: vi.fn(), get: vi.fn(), upsertSubscription: vi.fn() }));
vi.mock("@polar-sh/sdk", () => ({ Polar: mocks.Polar }));
vi.mock("@/lib/data", () => ({ upsertSubscription: mocks.upsertSubscription }));
function pages(...items: { id: string; status: string; endedAt?: Date | null }[][]) {
  return { [Symbol.asyncIterator]: async function* () { for (const page of items) yield { result: { items: page } }; } };
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("MOCK_SERVICES", "");
  vi.stubEnv("POLAR_ACCESS_TOKEN", "test-token");
  vi.stubEnv("POLAR_SERVER", "sandbox");
  vi.stubEnv("POLAR_PRO_PRODUCT_ID", "pro-product");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://finsight.example");
  mocks.Polar.mockImplementation(function () { return { checkouts: { create: mocks.checkout }, customerSessions: { create: mocks.portal }, subscriptions: { list: mocks.list, revoke: mocks.revoke, get: mocks.get } }; });
});
afterEach(() => vi.unstubAllEnvs());
describe("명시적 Polar mock", () => {
  it("mock checkout에서만 구독을 active로 기록하고 대시보드로 이동한다", async () => {
    vi.stubEnv("MOCK_SERVICES", "claude,polar");
    expect(await createCheckout("owner", "member@example.com")).toBe("https://finsight.example/dashboard?checkout=success");
    expect(mocks.upsertSubscription).toHaveBeenCalledWith({ userId: "owner", polarSubscriptionId: "mock_owner", polarCustomerId: "mock_owner", status: "active", cancelAtPeriodEnd: false, currentPeriodEnd: null });
    expect(mocks.Polar).not.toHaveBeenCalled();
  });
  it("mock 포털은 설정으로 이동하고 취소는 동일 mock 구독을 canceled로 저장한다", async () => {
    vi.stubEnv("MOCK_SERVICES", "polar");
    expect(await createPortalUrl("owner")).toBe("https://finsight.example/settings");
    await cancelSubscriptions("owner");
    expect(mocks.upsertSubscription).toHaveBeenCalledWith(expect.objectContaining({ userId: "owner", polarSubscriptionId: "mock_owner", status: "canceled" }));
    expect(mocks.Polar).not.toHaveBeenCalled();
  });
  it.each([createCheckout, createPortalUrl, cancelSubscriptions])("키가 없고 mock 미설정이면 가짜 성공 대신 실패한다", async (operation) => {
    vi.stubEnv("POLAR_ACCESS_TOKEN", "");
    await expect(operation("owner", "member@example.com")).rejects.toBeInstanceOf(PolarServiceError);
    expect(mocks.upsertSubscription).not.toHaveBeenCalled();
  });
});
describe("실제 Polar SDK 계약", () => {
  it("웹훅용 현재 구독 상태를 ID로 조회해 저장할 필드만 돌려준다", async () => {
    mocks.get.mockResolvedValue({
      id: "polar-sub", customerId: "polar-customer", status: "canceled", cancelAtPeriodEnd: false,
      currentPeriodEnd: new Date("2026-10-29T00:00:00Z"), customer: { email: "member@example.com" },
    });
    expect(await getSubscription("polar-sub")).toEqual({
      customerId: "polar-customer", status: "canceled", cancelAtPeriodEnd: false, currentPeriodEnd: "2026-10-29T00:00:00.000Z",
    });
    expect(mocks.get).toHaveBeenCalledWith({ id: "polar-sub" });
  });
  it("현재 구독 조회 실패는 원문 없이 PolarServiceError로 바꾼다", async () => {
    mocks.get.mockRejectedValue(new Error("Polar 원문"));
    await expect(getSubscription("polar-sub")).rejects.toEqual(new PolarServiceError());
  });
  it("서버에서 상품·검증된 사용자·성공 URL을 지정한다", async () => {
    mocks.checkout.mockResolvedValue({ url: "https://polar.example/checkout" });
    expect(await createCheckout("owner", "member@example.com")).toBe("https://polar.example/checkout");
    expect(mocks.Polar).toHaveBeenCalledWith(expect.objectContaining({ accessToken: "test-token", server: "sandbox" }));
    expect(mocks.checkout).toHaveBeenCalledWith({ products: ["pro-product"], externalCustomerId: "owner", customerEmail: "member@example.com", successUrl: "https://finsight.example/dashboard?checkout=success" });
    expect(mocks.upsertSubscription).not.toHaveBeenCalled();
  });
  it("고객 세션은 external ID로 생성한다", async () => {
    mocks.portal.mockResolvedValue({ customerPortalUrl: "https://polar.example/portal" });
    expect(await createPortalUrl("owner")).toBe("https://polar.example/portal");
    expect(mocks.portal).toHaveBeenCalledWith({ externalCustomerId: "owner" });
  });
  it("고객 세션의 404는 고객 없음으로 처리한다", async () => {
    mocks.portal.mockRejectedValue({ statusCode: 404 });
    expect(await createPortalUrl("owner")).toBeNull();
    mocks.portal.mockRejectedValue({ statusCode: 502, message: "원문" });
    await expect(createPortalUrl("owner")).rejects.toEqual(new PolarServiceError());
  });
  it("Polar의 external ID 고객 없음 422는 null이고 다른 검증 오류는 실패한다", async () => {
    mocks.portal.mockRejectedValue({ statusCode: 422, detail: [{ loc: ["body", "external_customer_id"], msg: "Customer does not exist.", type: "value_error" }] });
    expect(await createPortalUrl("owner")).toBeNull();
    mocks.portal.mockRejectedValue({ statusCode: 422, detail: [{ loc: ["body", "external_customer_id"], msg: "Invalid value", type: "value_error" }] });
    await expect(createPortalUrl("owner")).rejects.toBeInstanceOf(PolarServiceError);
  });
  it.each(["", "invalid"])("상품·서버 설정 오류는 mock으로 바꾸지 않는다 (%s)", async (value) => {
    vi.stubEnv(value ? "POLAR_SERVER" : "POLAR_PRO_PRODUCT_ID", value);
    await expect(createCheckout("owner", "email@example.com")).rejects.toBeInstanceOf(PolarServiceError);
    expect(mocks.checkout).not.toHaveBeenCalled();
  });
  it("외부 오류 원문을 서비스 밖으로 내보내지 않는다", async () => {
    mocks.checkout.mockRejectedValue(new Error("민감한 원문"));
    await expect(createCheckout("owner", "member@example.com")).rejects.toEqual(new PolarServiceError());
  });
});
describe("R1: 탈퇴용 구독 취소", () => {
  it("로컬 row 없이도 모든 Polar 페이지를 먼저 읽고 청구 가능한 구독을 취소·재확인한다", async () => {
    mocks.list.mockResolvedValueOnce(pages([{ id: "active", status: "active" }, { id: "canceled", status: "canceled" }], [{ id: "trial", status: "trialing" }, { id: "past", status: "past_due" }, { id: "unpaid", status: "unpaid" }]))
      .mockResolvedValueOnce(pages([{ id: "active", status: "canceled" }]));
    await cancelSubscriptions("owner");
    expect(mocks.list.mock.calls).toEqual([[{ externalCustomerId: "owner", limit: 100 }], [{ externalCustomerId: "owner", limit: 100 }]]);
    expect(mocks.revoke.mock.calls).toEqual([[{ id: "active" }], [{ id: "trial" }], [{ id: "past" }], [{ id: "unpaid" }]]);
    expect(mocks.upsertSubscription).not.toHaveBeenCalled();
  });
  it("이미 종료된 구독은 취소 없이 성공한다", async () => {
    mocks.list.mockResolvedValue(pages([{ id: "old", status: "canceled" }, { id: "revoked", status: "revoked" }, { id: "expired", status: "incomplete_expired" }]));
    await expect(cancelSubscriptions("owner")).resolves.toBeUndefined();
    expect(mocks.revoke).not.toHaveBeenCalled();
  });
  it("취소 응답 오류여도 재조회에서 종료가 확인되면 재시도 성공이다", async () => {
    mocks.list.mockResolvedValueOnce(pages([{ id: "active", status: "active" }])).mockResolvedValueOnce(pages([]));
    mocks.revoke.mockRejectedValue({ statusCode: 404 });
    await expect(cancelSubscriptions("owner")).resolves.toBeUndefined();
  });
  it("취소 후 청구 가능한 구독이 남으면 실패한다", async () => {
    mocks.list.mockResolvedValue(pages([{ id: "active", status: "active" }]));
    await expect(cancelSubscriptions("owner")).rejects.toEqual(new PolarServiceError("subscription_cancel_failed"));
  });
  it("조회 실패 시 취소 완료로 간주하지 않는다", async () => {
    mocks.list.mockRejectedValue(new Error("원문"));
    await expect(cancelSubscriptions("owner")).rejects.toEqual(new PolarServiceError("subscription_cancel_failed"));
  });
});
