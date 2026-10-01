import type { HTMLAttributes } from "react";

export function Badge({ inverse = false, className = "", ...props }: HTMLAttributes<HTMLSpanElement> & { inverse?: boolean }) {
  return <span {...props} className={`inline-flex items-center rounded-pill border px-3 py-1 text-xs font-medium whitespace-nowrap ${inverse ? "border-ink bg-ink text-on-primary" : "border-hairline bg-canvas text-ink"} ${className}`} />;
}
