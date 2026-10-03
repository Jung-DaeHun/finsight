import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { logError } from "@/lib/log";

afterEach(() => vi.restoreAllMocks());

describe("logError", () => {
  it("메타데이터 타입에는 코드·분석 ID·소요 시간만 허용한다", () => {
    expectTypeOf<Parameters<typeof logError>[1]>().toEqualTypeOf<{
      code?: string; analysisId?: string; durationMs?: number;
    }>();
  });

  it("이벤트와 허용된 메타데이터를 기록한다", () => {
    const logger = vi.spyOn(console, "error").mockImplementation(() => {});
    const meta = { code: "timeout", analysisId: "analysis-1", durationMs: 0 };
    logError("analysis_failed", meta);
    expect(logger).toHaveBeenCalledExactlyOnceWith("analysis_failed", meta);
  });

  it("타입 경계를 우회한 추가 메타데이터도 기록하지 않는다", () => {
    const logger = vi.spyOn(console, "error").mockImplementation(() => {});
    const meta = { code: "file_unreadable", merchant: "가맹점", fileContents: "파일 내용", transactions: [] };
    logError("analysis_failed", meta);
    expect(logger).toHaveBeenCalledExactlyOnceWith("analysis_failed", { code: "file_unreadable" });
  });

  it("메타데이터를 모두 생략할 수 있다", () => {
    const logger = vi.spyOn(console, "error").mockImplementation(() => {});
    logError("analysis_failed", {});
    expect(logger).toHaveBeenCalledExactlyOnceWith("analysis_failed", {});
  });
});
