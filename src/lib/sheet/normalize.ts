import type { ColumnMapping, RawTx } from "@/types";
import { SheetError } from "./errors";

type DateParts = { year?: number; month: number; day: number };

const DATE_FORMATS: Record<string, RegExp> = {
  "YYYY-MM-DD": /^(\d{4})-(\d{2})-(\d{2})$/,
  "YYYY.MM.DD": /^(\d{4})\.(\d{2})\.(\d{2})$/,
  "YYYY/MM/DD": /^(\d{4})\/(\d{2})\/(\d{2})$/,
  YYYYMMDD: /^(\d{4})(\d{2})(\d{2})$/,
  "YYYY-M-D": /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
  "YYYY년 M월 D일": /^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일$/,
  "MM/DD/YYYY": /^(\d{2})\/(\d{2})\/(\d{4})$/,
  "DD/MM/YYYY": /^(\d{2})\/(\d{2})\/(\d{4})$/,
  "MM/DD": /^(\d{2})\/(\d{2})$/,
};

function parseDateParts(value: string, format: string): DateParts | null {
  const match = DATE_FORMATS[format]?.exec(value.trim());
  if (!match) return null;
  if (format === "MM/DD") return { month: Number(match[1]), day: Number(match[2]) };
  if (format === "MM/DD/YYYY") return { year: Number(match[3]), month: Number(match[1]), day: Number(match[2]) };
  if (format === "DD/MM/YYYY") return { year: Number(match[3]), month: Number(match[2]), day: Number(match[1]) };
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function validDate(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || year < 1 || year > 9999 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= days[month - 1];
}

function parseAmount(value: string): number | null {
  const trimmed = value.trim();
  const parenthesized = trimmed.startsWith("(") && trimmed.endsWith(")");
  const inner = parenthesized ? trimmed.slice(1, -1).trim() : trimmed;
  const match = /^([+-]?)\s*₩?\s*((?:\d{1,3}(?:,\d{3})+|\d+))(?:\.00)?\s*원?$/u.exec(inner);
  if (!match || (parenthesized && match[1])) return null;
  const amount = Number(match[2].replaceAll(",", ""));
  if (!Number.isSafeInteger(amount)) return null;
  return parenthesized || match[1] === "-" ? -amount : amount;
}

function mappedColumns(rows: string[][], mapping: ColumnMapping) {
  if (!mapping.isTransactions) throw new SheetError("not_transactions");
  if (!mapping.isKrw) throw new SheetError("unsupported_currency");
  if (!Number.isInteger(mapping.headerRowIndex) || mapping.headerRowIndex < 0 || mapping.headerRowIndex >= rows.length ||
      !DATE_FORMATS[mapping.dateFormat] || (mapping.dateFormat === "MM/DD" && !Number.isInteger(mapping.assumedYear))) {
    throw new SheetError("mapping_failed");
  }
  const header = rows[mapping.headerRowIndex].map((cell) => cell.trim());
  function indexOf(name: string): number {
    const matches = header.flatMap((cell, index) => cell === name.trim() ? [index] : []);
    if (matches.length !== 1) throw new SheetError("mapping_failed");
    return matches[0];
  }
  const date = indexOf(mapping.dateColumn);
  const merchant = indexOf(mapping.merchantColumn);
  const description = mapping.descriptionColumn === undefined ? undefined : indexOf(mapping.descriptionColumn);
  const amount = mapping.amount.mode === "single"
    ? { mode: "single" as const, column: indexOf(mapping.amount.column), debitIsNegative: mapping.amount.debitIsNegative }
    : { mode: "split" as const, debit: indexOf(mapping.amount.debitColumn), credit: indexOf(mapping.amount.creditColumn) };
  return { header, date, merchant, description, amount };
}

const TOTAL_LABEL = /^(?:합\s*계|소\s*계|총\s*계|total|subtotal|grand\s+total)$/i;

/** 매핑된 원화 거래만 반환한다. 날짜와 금액은 결정론적으로 검증한다. */
export function normalize(rows: string[][], mapping: ColumnMapping): { txs: RawTx[]; skipped: number } {
  const columns = mappedColumns(rows, mapping);
  const txs: RawTx[] = [];
  let invalid = 0;
  let candidates = 0;
  let skipped = 0;
  let year = mapping.assumedYear;
  let previousMonth: number | undefined;

  for (const row of rows.slice(mapping.headerRowIndex + 1)) {
    const cells = row.map((cell) => cell.trim());
    if (cells.every((cell) => !cell)) continue;
    if (columns.header.every((cell, index) => cell === (cells[index] ?? ""))) continue;
    if (!(cells[columns.date] ?? "") && [cells[columns.merchant], columns.description === undefined ? "" : cells[columns.description]]
      .some((cell) => TOTAL_LABEL.test(cell ?? ""))) continue;

    candidates++;
    const parts = parseDateParts(cells[columns.date] ?? "", mapping.dateFormat);
    let occurredOn: string | null = null;
    if (parts) {
      const resolvedYear = parts.year ?? (year !== undefined && previousMonth === 12 && parts.month === 1 ? year + 1 : year);
      if (resolvedYear !== undefined && validDate(resolvedYear, parts.month, parts.day)) {
        year = resolvedYear;
        previousMonth = parts.month;
        occurredOn = `${String(resolvedYear).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
      }
    }

    let amount: number | null = null;
    let direction: RawTx["direction"] = "debit";
    if (columns.amount.mode === "single") {
      const signed = parseAmount(cells[columns.amount.column] ?? "");
      if (signed !== null) {
        amount = Math.abs(signed);
        direction = (signed < 0) === columns.amount.debitIsNegative ? "debit" : "credit";
      }
    } else {
      const debitText = cells[columns.amount.debit] ?? "";
      const creditText = cells[columns.amount.credit] ?? "";
      const debit = debitText ? parseAmount(debitText) : 0;
      const credit = creditText ? parseAmount(creditText) : 0;
      if (debit !== null && credit !== null && debit >= 0 && credit >= 0 && !(debit > 0 && credit > 0)) {
        amount = debit || credit;
        direction = debit > 0 ? "debit" : "credit";
        if (!debitText && !creditText) amount = null;
      }
    }

    if (!occurredOn || amount === null) {
      invalid++;
      skipped++;
      continue;
    }
    if (amount === 0) {
      skipped++;
      continue;
    }
    const merchant = cells[columns.merchant] ?? "";
    const description = columns.description === undefined ? "" : (cells[columns.description] ?? "");
    txs.push({ occurredOn, amount, direction, merchant, ...(description ? { description } : {}) });
  }

  if (candidates > 0 && invalid / candidates > 0.2) throw new SheetError("too_many_invalid_rows");
  if (txs.length === 0) throw new SheetError("not_transactions");
  return { txs, skipped };
}
