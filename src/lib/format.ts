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

/** 분석 생성·구독 만료 시각(timestamptz)을 한국 날짜로 표시한다. 거래일에는 쓰지 않는다. KST는 서머타임 없는 UTC+9다. */
export function formatKstDate(timestamp: string): string {
  return formatFullDate(new Date(Date.parse(timestamp) + 9 * 3_600_000).toISOString());
}

export function formatMonthTitle(date: string): string {
  return `${date.slice(0, 4)}년 ${Number(date.slice(5, 7))}월`;
}

/** 거래일은 문자열로 유지하고 일수 차이만 UTC로 계산한다. */
export function periodDayCount(from: string, to: string): number {
  if (!from || !to || to < from) return 0;
  const utcDay = (date: string) => Date.UTC(
    Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)),
  );
  return Math.floor((utcDay(to) - utcDay(from)) / 86_400_000) + 1;
}

export function formatBytes(n: number): string {
  return n >= 1_048_576
    ? `${(n / 1_048_576).toLocaleString("ko-KR", { maximumFractionDigits: 1 })} MB`
    : `${(n / 1_024).toLocaleString("ko-KR", { maximumFractionDigits: 1 })} KB`;
}
