import type { ButtonHTMLAttributes } from "react";
import { Icon, type IconName } from "./Icon";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
  "aria-label": string;
  icon: IconName;
  variant?: "ghost" | "soft";
  size?: 36 | 40;
};

export function IconButton({ icon, variant = "soft", size = 40, className = "", type = "button", ...props }: Props) {
  return <button {...props} type={type} title={props["aria-label"]} className={`inline-flex shrink-0 items-center justify-center rounded-full text-ink transition-opacity duration-150 active:opacity-50 ${variant === "soft" ? "bg-soft-cloud" : "bg-transparent"} ${size === 36 ? "h-9 w-9" : "h-10 w-10"} ${className}`}><Icon name={icon} size={size === 36 ? 20 : 24} /></button>;
}
