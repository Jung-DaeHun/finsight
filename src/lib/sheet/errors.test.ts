import { expect, it } from "vitest";
import { SheetError } from "@/lib/sheet/errors";

it("SheetError는 원본 파일 내용 없이 파이프라인에 오류 코드만 전달한다", () => {
  const error = new SheetError("unsupported_encoding");
  expect(error).toBeInstanceOf(Error);
  expect(error.name).toBe("SheetError");
  expect(error.code).toBe("unsupported_encoding");
  expect(error.message).toBe("unsupported_encoding");
});
