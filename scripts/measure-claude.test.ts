// @vitest-environment node
import { expect, it, vi } from "vitest";
import type { ColumnMapping } from "../src/types";
import { measureClaude } from "./measure-claude";

it("Sonnet·Opus 각각 매핑 1회와 고유 가맹점 100개 분류 시간을 출력한다", async () => {
  const mapping: ColumnMapping = {
    isTransactions: true, isKrw: true, headerRowIndex: 0, dateColumn: "거래일", dateFormat: "YYYY-MM-DD",
    merchantColumn: "가맹점", amount: { mode: "single", column: "금액", debitIsNegative: false },
  };
  const mapColumns = vi.fn(async () => mapping);
  const classifyMerchants = vi.fn(async () => ({}));
  const lines: string[] = [];
  let ticks = 0;
  await measureClaude({ mapColumns, classifyMerchants }, () => ticks++ * 10, (line) => lines.push(line));
  expect(mapColumns.mock.calls).toHaveLength(2);
  expect(classifyMerchants.mock.calls).toHaveLength(2);
  expect(mapColumns.mock.calls.map((call) => call[2])).toEqual(["free", "pro"]);
  expect(classifyMerchants.mock.calls[0][0]).toHaveLength(100);
  expect(new Set(classifyMerchants.mock.calls[0][0]).size).toBe(100);
  expect(lines.join(" ")).toContain("10 ms");
});
