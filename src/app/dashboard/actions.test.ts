// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { getFailedUploadFilename } from "./actions";
const mocks = vi.hoisted(() => ({ getUserId: vi.fn(), getAnalysisView: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getUserId: mocks.getUserId }));
vi.mock("@/lib/data", () => ({ getAnalysisView: mocks.getAnalysisView }));
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUserId.mockResolvedValue("owner");
  mocks.getAnalysisView.mockResolvedValue({ id: "analysis", status: "failed", failedUpload: { id: "upload", filename: "실패.xlsx" } });
});
it("5.1: claims 소유권 조회 후 uploadId가 일치하는 실패 파일명만 반환한다", async () => {
  expect(await getFailedUploadFilename("analysis", "upload")).toBe("실패.xlsx");
  expect(mocks.getAnalysisView).toHaveBeenCalledWith("owner", "analysis");
});
it("인증되지 않은 사용자는 파일명을 조회하지 않는다", async () => {
  mocks.getUserId.mockResolvedValue(null);
  expect(await getFailedUploadFilename("analysis", "upload")).toBeNull();
  expect(mocks.getAnalysisView).not.toHaveBeenCalled();
});
it.each([null, { status: "completed", failedUpload: { id: "upload", filename: "비공개.csv" } }, { status: "failed", failedUpload: { id: "other", filename: "비공개.csv" } }])("타인·없는 분석·다른 업로드·완료 건은 파일명을 반환하지 않는다 (%j)", async (view) => {
  mocks.getAnalysisView.mockResolvedValue(view);
  expect(await getFailedUploadFilename("analysis", "upload")).toBeNull();
});
it("조회 장애 원문을 반환하지 않는다", async () => {
  mocks.getAnalysisView.mockRejectedValue(new Error("비공개 DB 응답"));
  expect(await getFailedUploadFilename("analysis", "upload")).toBeNull();
});
