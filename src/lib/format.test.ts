import { describe, expect, it } from "vitest";
import { formatBytes, formatFullDate, formatManWon, formatMonthTitle, formatShortDate, formatWon } from "./format";

describe("표시 형식", () => {
  it("원화와 음수를 표시한다", () => {
    expect(formatWon(1234567)).toBe("₩1,234,567");
    expect(formatWon(-1000)).toBe("-₩1,000");
  });
  it("만원 단위로 반올림한다", () => {
    expect(formatManWon(14999)).toBe("1만");
    expect(formatManWon(15000)).toBe("2만");
  });
  it("날짜 문자열을 시간대 변환 없이 표시한다", () => {
    expect(formatShortDate("2026-09-14")).toBe("09.14");
    expect(formatFullDate("2026-10-01")).toBe("2026.10.01");
    expect(formatMonthTitle("2026-09-14")).toBe("2026년 9월");
  });
  it("파일 크기를 표시한다", () => {
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1048576)).toBe("1 MB");
  });
});
