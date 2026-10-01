import type { ButtonHTMLAttributes } from "react";

export function FilterChip({ active = false, className = "", type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return <button {...props} type={type} aria-pressed={active} className={`inline-flex h-10 items-center rounded-pill border px-4 text-base font-medium whitespace-nowrap ${active ? "border-ink bg-ink text-on-primary" : "border-hairline bg-canvas text-ink"} ${className}`} />;
}
