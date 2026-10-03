import { describe, expect, it } from "vitest";
import { ERROR_MESSAGES } from "@/messages/errors";
import { ANALYSIS_ERROR_CODES, API_ERROR_CODES } from "@/types/errors";

describe("에러 코드와 한국어 문구", () => {
  it("ARCHITECTURE 5.4의 분석·API 에러 코드를 빠짐없이 정의한다", () => {
    expect(ANALYSIS_ERROR_CODES).toEqual([
      "not_transactions", "mapping_failed", "too_many_invalid_rows", "file_unreadable",
      "file_encrypted", "llm_unavailable", "timeout", "too_many_rows", "unsupported_encoding",
      "unsupported_currency", "storage_upload_failed", "internal_error",
    ]);
    expect(API_ERROR_CODES).toEqual([
      "unauthorized", "not_found", "file_too_large", "too_many_files", "monthly_limit",
      "duplicate_file", "already_pro", "pro_required", "analysis_in_progress",
      "storage_delete_failed", "subscription_cancel_failed", "account_delete_failed", "internal_error",
    ]);
  });

  it("모든 에러 코드에 비어 있지 않은 한국어 문구가 있다", () => {
    // internal_error는 분석 실패 코드이자 API 코드다.
    const codes = [...new Set([...ANALYSIS_ERROR_CODES, ...API_ERROR_CODES])];
    expect(Object.keys(ERROR_MESSAGES).sort()).toEqual([...codes].sort());
    for (const code of codes) {
      expect(ERROR_MESSAGES[code].trim()).toMatch(/[가-힣]/);
    }
  });

  it("디자인의 파일 오류 문구를 그대로 사용한다", () => {
    expect(ERROR_MESSAGES.file_encrypted).toBe("암호가 걸린 파일입니다. 엑셀에서 열고 [파일 → 정보 → 통합 문서 보호 → 암호 설정]에서 암호를 지운 뒤 다시 저장해 올려 주세요.");
    expect(ERROR_MESSAGES.unsupported_currency).toBe("원화(KRW) 금액 열이 없는 외화 명세서는 분석할 수 없습니다. 원화 환산 금액이 포함된 명세서를 받아 주세요.");
    expect(ERROR_MESSAGES.duplicate_file).toBe("같은 내용의 파일을 이미 분석했습니다. 기존 분석은 대시보드에서 볼 수 있습니다.");
    expect(ERROR_MESSAGES.file_too_large).toBe("1MB를 넘는 파일입니다. 기간을 나눠 다시 내려받아 주세요.");
    expect(ERROR_MESSAGES.too_many_rows).toBe("시트가 1,200행을 넘습니다. 기간을 나눠 다시 내려받아 주세요.");
  });

  it("월 한도는 다음 달 1일(UTC)의 초기화를 안내한다", () => {
    expect(ERROR_MESSAGES.monthly_limit).toContain("다음 달 1일(UTC)");
    expect(ERROR_MESSAGES.monthly_limit).toContain("초기화");
  });
});
