import { expect, it } from "vitest";
import { AUTH_ERROR_CODES } from "./errors";
import { AUTH_ERROR_MESSAGES } from "@/messages/errors";

it("인증 코드별 한국어 오류 문구가 빠짐없이 정의된다", () => {
  expect(Object.keys(AUTH_ERROR_MESSAGES).sort()).toEqual([...AUTH_ERROR_CODES].sort());
  for (const code of AUTH_ERROR_CODES) expect(AUTH_ERROR_MESSAGES[code]).toMatch(/[가-힣]/);
});
