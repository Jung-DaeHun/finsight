import { describe, expect, it } from "vitest";
import { confirmationNext, isProtectedPath } from "./auth-flow";

describe("J1.5 proxy 보호 경로", () => {
  it.each(["/dashboard", "/dashboard/", "/dashboard/analyses/id", "/settings", "/settings/account"])("%s를 보호한다", (path) => {
    expect(isProtectedPath(path)).toBe(true);
  });
  it.each(["/", "/login", "/signup", "/reset-password", "/dashboard-public", "/settings-other", "/api/analyses", "/api/webhooks/polar"])("%s는 페이지 인증 redirect 대상이 아니다", (path) => {
    expect(isProtectedPath(path)).toBe(false);
  });
});

describe("이메일 확인 next 허용 목록", () => {
  it.each(["/dashboard", "/reset-password"])("%s를 허용한다", (path) => {
    expect(confirmationNext(path)).toBe(path);
  });
  it.each([null, "", "https://evil.com", "//evil.com", "/\\evil.com", "/settings", "/reset-password?next=https://evil.com", "%2F%2Fevil.com"])("%s는 대시보드로 대체한다", (path) => {
    expect(confirmationNext(path)).toBe("/dashboard");
  });
});
