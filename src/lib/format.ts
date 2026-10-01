export function formatWon(n: number): string {
  return `${n < 0 ? "-" : ""}₩${Math.abs(n).toLocaleString("ko-KR")}`;
}

export function formatManWon(n: number): string {
  return `${Math.round(n / 10_000)}만`;
}

export function formatShortDate(date: string): string {
  return `${date.slice(5, 7)}.${date.slice(8, 10)}`;
}

export function formatFullDate(date: string): string {
  return `${date.slice(0, 4)}.${date.slice(5, 7)}.${date.slice(8, 10)}`;
}

export function formatMonthTitle(date: string): string {
  return `${date.slice(0, 4)}년 ${Number(date.slice(5, 7))}월`;
}

export function formatBytes(n: number): string {
  return n >= 1_048_576
    ? `${(n / 1_048_576).toLocaleString("ko-KR", { maximumFractionDigits: 1 })} MB`
    : `${(n / 1_024).toLocaleString("ko-KR", { maximumFractionDigits: 1 })} KB`;
}
