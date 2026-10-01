import type { InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
};

export function Field({ id, label, hint, error, className = "", ...props }: Props) {
  const describedBy = [props["aria-describedby"], hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  return <div className="flex flex-col gap-2">
    <label htmlFor={id} className="text-sm font-medium text-ink">{label}</label>
    <input {...props} id={id} aria-invalid={!!error} aria-describedby={describedBy} className={`h-12 w-full rounded-input border border-hairline bg-canvas px-4 text-base text-ink outline-none focus:border-2 focus:border-ink focus:px-[15px] ${error ? "border-sale" : ""} ${className}`} />
    {hint && <p id={`${id}-hint`} className="text-xs text-mute">{hint}</p>}
    {error && <p id={`${id}-error`} className="text-xs text-sale">{error}</p>}
  </div>;
}
