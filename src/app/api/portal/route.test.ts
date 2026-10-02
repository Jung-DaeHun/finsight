// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { GET } from "./route";
const mocks = vi.hoisted(() => ({ getUserId: vi.fn(), createPortalUrl: vi.fn(), logError: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getUserId: mocks.getUserId }));
vi.mock("@/services/polar", () => ({ createPortalUrl: mocks.createPortalUrl }));
vi.mock("@/lib/log", () => ({ logError: mocks.logError }));
beforeEach(() => { vi.resetAllMocks(); mocks.getUserId.mockResolvedValue("owner"); mocks.createPortalUrl.mockResolvedValue("https://polar.example/portal"); });
it("비인증은 401이다", async () => {
  mocks.getUserId.mockResolvedValue(null);
  const response = await GET();
  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ error: { code: "unauthorized" } });
  expect(mocks.createPortalUrl).not.toHaveBeenCalled();
});
it("고객이 없으면 404이다", async () => {
  mocks.createPortalUrl.mockResolvedValue(null);
  const response = await GET();
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ error: { code: "not_found" } });
});
it("본인의 고객 포털로 302 이동한다", async () => {
  const response = await GET();
  expect(response.status).toBe(302);
  expect(response.headers.get("location")).toBe("https://polar.example/portal");
  expect(mocks.createPortalUrl).toHaveBeenCalledWith("owner");
});
it("서비스 실패는 안전한 502이다", async () => {
  mocks.createPortalUrl.mockRejectedValue(new Error("원문"));
  const response = await GET();
  expect(response.status).toBe(502);
  expect(await response.json()).toEqual({ error: { code: "internal_error" } });
});
