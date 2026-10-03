import { expect, it } from "vitest";
import { ClaudeServiceError } from "./claude-errors";

it("외부 예외 내용을 담지 않고 공개 오류 코드만 보존한다", () => {
  const error = new ClaudeServiceError("timeout");
  expect(error).toBeInstanceOf(Error);
  expect(error).toMatchObject({ name: "ClaudeServiceError", code: "timeout", message: "timeout" });
});
