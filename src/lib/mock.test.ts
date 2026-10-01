import { afterEach, describe, expect, it } from "vitest";
import { isMocked } from "./mock";

const original = process.env.MOCK_SERVICES;
afterEach(() => {
  if (original === undefined) delete process.env.MOCK_SERVICES;
  else process.env.MOCK_SERVICES = original;
});

describe("명시적 mock 설정", () => {
  it("콤마 구분 값의 정확한 이름만 인정한다", () => {
    process.env.MOCK_SERVICES = " claude, polar-extra ";
    expect(isMocked("claude")).toBe(true);
    expect(isMocked("polar")).toBe(false);
    process.env.MOCK_SERVICES = "claude,polar";
    expect(isMocked("polar")).toBe(true);
  });
  it("설정이 없으면 키 유무와 상관없이 꺼진다", () => {
    delete process.env.MOCK_SERVICES;
    expect(isMocked("claude")).toBe(false);
  });
});
