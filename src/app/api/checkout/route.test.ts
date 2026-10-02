// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GET } from "./route";
const mocks = vi.hoisted(() => ({ getUserId: vi.fn(), getClaims: vi.fn(), getUserPlan: vi.fn(), createCheckout: vi.fn(), logError: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getUserId: mocks.getUserId }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getClaims: mocks.getClaims } }) }));
vi.mock("@/lib/data", () => ({ getUserPlan: mocks.getUserPlan }));
vi.mock("@/services/polar", () => ({ createCheckout: mocks.createCheckout }));
vi.mock("@/lib/log", () => ({ logError: mocks.logError }));
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUserId.mockResolvedValue("owner");
  mocks.getUserPlan.mockResolvedValue("free");
  mocks.getClaims.mockResolvedValue({ data: { claims: { sub: "owner", email: "member@example.com" } }, error: null });
  mocks.createCheckout.mockResolvedValue("https://polar.example/checkout");
});
afterEach(() => vi.unstubAllEnvs());
it("비인증은 401이고 결제를 호출하지 않는다", async () => {
  mocks.getUserId.mockResolvedValue(null);
  const response = await GET();
  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ error: { code: "unauthorized" } });
  expect(mocks.createCheckout).not.toHaveBeenCalled();
});
it("이미 Pro이면 409이다", async () => {
  mocks.getUserPlan.mockResolvedValue("pro");
  const response = await GET();
  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({ error: { code: "already_pro" } });
  expect(mocks.createCheckout).not.toHaveBeenCalled();
});
it("검증된 ID·이메일로 checkout을 만들고 302로 이동한다", async () => {
  const response = await GET();
  expect(response.status).toBe(302);
  expect(response.headers.get("location")).toBe("https://polar.example/checkout");
  expect(mocks.createCheckout).toHaveBeenCalledWith("owner", "member@example.com");
});
it.each([{ sub: "foreign", email: "member@example.com" }, { sub: "owner" }])("claims 소유자·이메일이 불일치하면 401이다", async (claims) => {
  mocks.getClaims.mockResolvedValue({ data: { claims }, error: null });
  expect((await GET()).status).toBe(401);
  expect(mocks.createCheckout).not.toHaveBeenCalled();
});
it("외부 서비스 실패는 안전한 502이다", async () => {
  mocks.createCheckout.mockRejectedValue(new Error("원문"));
  const response = await GET();
  expect(response.status).toBe(502);
  expect(await response.json()).toEqual({ error: { code: "internal_error" } });
  expect(mocks.logError).toHaveBeenCalledWith("checkout_failed", { code: "internal_error" });
});
