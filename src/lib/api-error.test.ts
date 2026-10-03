import { describe, expect, it } from "vitest";
import { apiError } from "@/lib/api-error";

describe("apiError", () => {
  it("API 오류를 지정한 HTTP 상태와 JSON 계약으로 반환한다", async () => {
    const response = apiError("unauthorized", 401);
    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual({ error: { code: "unauthorized" } });
  });

  it("분석·파일 실패 식별자를 오류 객체 안에 포함한다", async () => {
    const response = apiError("file_encrypted", 422, { analysisId: "analysis-1", uploadId: "upload-1" });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: { code: "file_encrypted", analysisId: "analysis-1", uploadId: "upload-1" },
    });
  });

  it("선택 식별자는 독립적으로 생략할 수 있고 추가 내부 필드는 노출하지 않는다", async () => {
    const extra = { analysisId: "analysis-1", internalOnly: "서버 전용", code: "덮어쓰기 금지" };
    expect(await apiError("timeout", 504, extra).json()).toEqual({
      error: { code: "timeout", analysisId: "analysis-1" },
    });
    expect(await apiError("file_unreadable", 422, { uploadId: "upload-1" }).json()).toEqual({
      error: { code: "file_unreadable", uploadId: "upload-1" },
    });
  });
});
