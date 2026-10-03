"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { SectionHead } from "@/components/ui/SectionHead";
import { Toast } from "@/components/ui/Toast";
import { formatKstDate, formatMonthTitle } from "@/lib/format";
import { ERROR_MESSAGES } from "@/messages/errors";
import type { AnalysisListItem } from "@/types";
import { API_ERROR_CODES } from "@/types/errors";

const errorSchema = z.object({ error: z.object({ code: z.enum(API_ERROR_CODES) }) });

export function AnalysisHistory({ items, disabled, onPendingChange }: {
  items: AnalysisListItem[];
  disabled: boolean;
  onPendingChange: (pending: boolean) => void;
}) {
  const router = useRouter();
  const [deleted, setDeleted] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const inFlight = useRef(false);
  const records = items.filter((item) => !deleted.includes(item.id));

  async function remove(id: string) {
    if (inFlight.current || disabled) return;
    inFlight.current = true;
    setPending(true); onPendingChange(true); setError(null);
    try {
      const response = await fetch(`/api/analyses/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (response.status === 401) { router.replace("/login"); return; }
      if (response.status !== 204) {
        const parsed = errorSchema.safeParse(await response.json());
        setError(ERROR_MESSAGES[parsed.success ? parsed.data.error.code : "internal_error"]);
        return;
      }
      setDeleted((previous) => [...previous, id]); setConfirm(null);
      setToast(id);
      router.refresh();
    } catch {
      setError(ERROR_MESSAGES.internal_error);
    } finally {
      inFlight.current = false;
      setPending(false); onPendingChange(false);
    }
  }

  return <section aria-label="분석 기록" className="mb-12">
    <SectionHead title="분석 기록" count={records.length} />
    <p className="mb-4 text-sm font-medium text-mute">삭제하면 원본 파일도 함께 삭제됩니다. 사용한 분석 횟수는 복구되지 않습니다.</p>
    {records.length === 0 ? <p className="text-mute">분석 기록이 없습니다.</p> : <ul>{records.map((item) => {
      const title = item.status === "completed" ? item.periodTo ? formatMonthTitle(item.periodTo) : "분석 결과" : item.status === "failed" ? "분석 실패" : "분석 중";
      return <li key={item.id} className="flex flex-wrap items-center gap-3 border-b border-hairline-soft py-2.5 text-sm font-medium">
        <div className="min-w-0 flex-1">
          <p>{title}</p>
          <p className="break-all text-mute">{[...item.filenames, formatKstDate(item.createdAt)].join(" · ")}</p>
          {confirm === item.id && error && <p role="alert" className="mt-2 text-xs text-sale">{error}</p>}
        </div>
        {confirm === item.id ? <div className="flex items-center gap-3">
          <button type="button" disabled={pending || disabled} onClick={() => { setConfirm(null); setError(null); }} className="text-sm font-medium text-ink disabled:text-stone">취소</button>
          <Button size="sm" disabled={pending || disabled} onClick={() => remove(item.id)}>{pending ? "삭제 중…" : "삭제"}</Button>
        </div> : <IconButton icon="trash-2" aria-label={`${title} 삭제`} variant="ghost" size={36} disabled={pending || disabled} onClick={() => { setConfirm(item.id); setError(null); }} />}
      </li>;
    })}</ul>}
    {toast && <Toast key={toast} message="분석을 삭제했습니다." onClose={() => setToast(null)} />}
  </section>;
}
