import { describe, expect, it } from "vitest";
import { formatBytes, formatFullDate, formatManWon, formatMonthTitle, formatShortDate, formatWon, periodDayCount } from "./format";

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

describe("일평균 기간 일수", () => {
  it.each([
    ["2026-09-01", "2026-09-30", 30],
    ["2026-09-14", "2026-09-14", 1],
    ["2026-09-30", "2026-10-02", 3],
    ["2026-12-31", "2027-01-01", 2],
    ["2024-02-28", "2024-03-01", 3],
    ["2026-03-07", "2026-03-10", 4],
    ["2026-09-30", "2026-09-01", 0],
    ["", "", 0],
  ])("%s~%s를 양 끝 날짜 포함 %i일로 계산한다", (from, to, days) => {
    expect(periodDayCount(from, to)).toBe(days);
  });
});
