import Link from "next/link";
import type { ButtonHTMLAttributes, MouseEventHandler, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "on-image";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  icon?: IconName;
  href?: string;
};

const variants = {
  primary: "bg-ink text-on-primary",
  secondary: "bg-soft-cloud text-ink",
  "on-image": "bg-canvas text-ink",
};
const sizes = {
  sm: "h-9 px-4 text-sm gap-2",
  md: "h-12 px-8 text-base gap-2",
  lg: "h-16 px-10 text-2xl gap-2.5",
};

export function Button({ children, variant = "primary", size = "md", fullWidth = false, icon, href, disabled, className = "", type = "button", ...props }: Props) {
  const classes = `inline-flex items-center justify-center rounded-pill font-medium whitespace-nowrap transition-[transform,opacity] duration-200 ease-standard active:scale-50 active:opacity-50 ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${disabled ? "!bg-hairline-soft !text-stone cursor-not-allowed active:scale-100 active:opacity-100" : ""} ${className}`;
  const content = <>{icon && <Icon name={icon} size={size === "sm" ? 16 : size === "lg" ? 24 : 20} />}{children}</>;
  if (href && !disabled) {
    const onClick = props.onClick as MouseEventHandler<HTMLAnchorElement> | undefined;
    // API 라우트(결제 등)는 Link의 prefetch·RSC 요청으로 실행되면 안 되므로 일반 이동으로 연다.
    if (href.startsWith("/api/")) return <a href={href} className={classes} onClick={onClick}>{content}</a>;
    return <Link href={href} className={classes} onClick={onClick}>{content}</Link>;
  }
  return <button {...props} type={type} disabled={disabled} className={classes}>{content}</button>;
}
