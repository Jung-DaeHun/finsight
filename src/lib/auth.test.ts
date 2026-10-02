// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUserId } from "./auth";
const mocks = vi.hoisted(() => ({ getClaims: vi.fn() }));
vi.mock("./supabase/server", () => ({ createClient: async () => ({ auth: mocks }) }));
beforeEach(() => vi.clearAllMocks());
describe("검증된 claims 인증", () => {
  it("getClaims의 sub만 반환한다", async () => {
    mocks.getClaims.mockResolvedValue({ data: { claims: { sub: "owner" } }, error: null });
    expect(await getUserId()).toBe("owner");
    expect(mocks.getClaims).toHaveBeenCalledOnce();
  });
  it.each([
    { data: null, error: null },
    { data: { claims: { sub: "owner" } }, error: { code: "invalid_jwt" } },
    { data: { claims: {} }, error: null },
    { data: { claims: { sub: "" } }, error: null },
  ])("인증 실패·sub 누락 시 null을 반환한다", async (response) => {
    mocks.getClaims.mockResolvedValue(response);
    expect(await getUserId()).toBeNull();
  });
});
