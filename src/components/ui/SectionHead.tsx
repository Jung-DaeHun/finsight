import type { ReactNode } from "react";
import { Badge } from "./Badge";

export function SectionHead({ title, count, action, pro = false }: { title: string; count?: number; action?: ReactNode; pro?: boolean }) {
  return <div className="mb-4 flex items-center justify-between gap-3 border-b border-ink pb-3"><div className="flex min-w-0 items-center gap-2"><h2 className="text-base font-medium text-ink">{title}{count !== undefined && <span className="text-mute"> ({count})</span>}</h2>{pro && <Badge inverse>Pro</Badge>}</div>{action}</div>;
}
