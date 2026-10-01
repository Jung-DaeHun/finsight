import type { ReactNode } from "react";

export function PageTitle({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-[32px] leading-[1.2] font-medium text-ink">{title}</h1>{description && <p className="mt-2 text-base text-mute">{description}</p>}</div>{action}</div>;
}
