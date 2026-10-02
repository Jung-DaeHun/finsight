import { expect, it } from "vitest";
import { AUTH_ERROR_CODES, PipelineError, StorageDeleteError } from "./errors";
import { AUTH_ERROR_MESSAGES } from "@/messages/errors";

it("인증 코드별 한국어 오류 문구가 빠짐없이 정의된다", () => {
  expect(Object.keys(AUTH_ERROR_MESSAGES).sort()).toEqual([...AUTH_ERROR_CODES].sort());
  for (const code of AUTH_ERROR_CODES) expect(AUTH_ERROR_MESSAGES[code]).toMatch(/[가-힣]/);
});

it("파이프라인 오류는 분석 코드와 선택적 업로드 ID만 전달한다", () => {
  const error = new PipelineError("mapping_failed", "upload");
  expect(error.message).toBe("mapping_failed");
  expect(error.name).toBe("PipelineError");
  expect(error.code).toBe("mapping_failed");
  expect(error.uploadId).toBe("upload");
  expect(new PipelineError("timeout").uploadId).toBeUndefined();
});

it("Storage 삭제 오류는 원문 없이 재시도 가능한 코드만 전달한다", () => {
  const error = new StorageDeleteError();
  expect(error.code).toBe("storage_delete_failed");
  expect(error.message).toBe("storage_delete_failed");
  expect(error.name).toBe("StorageDeleteError");
});
