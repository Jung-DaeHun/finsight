import type { ReactNode } from "react";

export function SectionHead({ title, count, action }: { title: string; count?: number; action?: ReactNode }) {
  return <div className="mb-4 flex items-center justify-between gap-3 border-b border-ink pb-3"><h2 className="text-base font-medium text-ink">{title}{count !== undefined && <span className="text-mute"> ({count})</span>}</h2>{action}</div>;
}
