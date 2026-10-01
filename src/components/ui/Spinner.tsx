export function Spinner({ large = false, label = "처리 중" }: { large?: boolean; label?: string }) {
  return <span role="status" aria-label={label} className={`inline-block shrink-0 animate-spin rounded-full border-hairline border-t-ink ${large ? "h-10 w-10 border-[3px]" : "h-5 w-5 border-2"}`} />;
}
