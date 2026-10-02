"use client";

import { useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { LockCard } from "@/components/ui/LockCard";
import { SectionHead } from "@/components/ui/SectionHead";
import { Spinner } from "@/components/ui/Spinner";
import { formatWon } from "@/lib/format";
import { ERROR_MESSAGES } from "@/messages/errors";
import type { AnalysisView, Insight } from "@/types";
import { useResultContext } from "./result-context";

const responseSchema = z.object({ insights: z.array(z.object({
  title: z.string(), body: z.string(), monthlySaving: z.number().int().nonnegative(),
})) });

function InsightContent({ view }: { view: AnalysisView }) {
  const { mode } = useResultContext();
  const [generated, setGenerated] = useState<Insight[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const insights = view.insights ?? generated;

  async function generate() {
    if (pending.current || mode === "sample") return;
    pending.current = true;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/analyses/${encodeURIComponent(view.id)}/insights`, { method: "POST" });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const parsed = z.object({ error: z.object({ code: z.string() }) }).safeParse(payload);
        const code = parsed.success ? parsed.data.error.code : "internal_error";
        setError(Object.hasOwn(ERROR_MESSAGES, code) ? ERROR_MESSAGES[code as keyof typeof ERROR_MESSAGES] : ERROR_MESSAGES.internal_error);
        return;
      }
      const parsed = responseSchema.safeParse(payload);
      if (!parsed.success) {
        setError(ERROR_MESSAGES.internal_error);
        return;
      }
      setGenerated(parsed.data.insights);
    } catch {
      setError(ERROR_MESSAGES.internal_error);
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }

  if (insights !== null && insights !== undefined) return <>
    <p className="text-sm font-medium text-mute">예상 절약 가능액</p>
    <p className="mb-2 font-display text-[32px] leading-none tracking-[0.01em]">월 {formatWon(insights.reduce((sum, item) => sum + item.monthlySaving, 0))}</p>
    <ol>{insights.map((item, i) => <li key={i} className="flex gap-3 border-b border-hairline-soft py-3 text-sm font-medium">
      <span className="w-5 shrink-0 text-mute">{i + 1}</span><div className="min-w-0 break-words"><h3 className="font-bold">{item.title}</h3><p className="mt-0.5 text-mute">{item.body}</p></div>
    </li>)}</ol>
  </>;
  return <div className="bg-soft-cloud p-8 text-center" aria-live="polite" aria-busy={loading}>
    {loading ? <><Spinner label="인사이트 생성 중" /><p className="mt-3 text-sm text-mute">거래 {view.summary?.transactionCount ?? 0}건을 살펴보는 중…</p></>
      : <>{error ? <p role="alert" className="mb-3 text-sm text-sale">{error}</p> : <p className="mb-3 text-sm text-mute">이번 분석 결과로 절약 포인트를 만들어 드립니다.</p>}
        {mode === "user" && <Button size="sm" onClick={generate}>{error ? "다시 시도" : "인사이트 생성"}</Button>}
      </>}
  </div>;
}

export function InsightsPanel({ view }: { view: AnalysisView }) {
  return <section aria-label="AI 인사이트"><SectionHead title="AI 인사이트" />
    {"insights" in view ? <InsightContent key={view.id} view={view} />
      : <LockCard title="AI 인사이트 & 절약 조언" description="이번 분석을 바탕으로 줄일 수 있는 지출과 예상 절약액을 알려드립니다." />}
  </section>;
}
