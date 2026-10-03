"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { ERROR_MESSAGES } from "@/messages/errors";
import { API_ERROR_CODES, type ApiErrorCode } from "@/types/errors";

const steps = ["Polar 구독 취소", "원본 파일 삭제", "계정 · 분석 데이터 삭제"];
const failureSteps: Partial<Record<ApiErrorCode, number>> = { subscription_cancel_failed: 0, storage_delete_failed: 1, account_delete_failed: 2 };
const errorSchema = z.object({ error: z.object({ code: z.enum(API_ERROR_CODES) }) });

export function WithdrawalModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<ApiErrorCode | null>(null);
  const inFlight = useRef(false);
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  const failedStep = error ? failureSteps[error] : undefined;

  useEffect(() => { close.current = onClose; }, [onClose]);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector<HTMLInputElement>("input")?.focus();
    function keyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); if (!inFlight.current) close.current(); }
      if (event.key !== "Tab") return;
      const controls = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)');
      if (!controls?.length) { event.preventDefault(); dialog.current?.focus(); return; }
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", keyDown);
    return () => {
      document.removeEventListener("keydown", keyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  async function withdraw() {
    if (text !== "탈퇴" || inFlight.current) return;
    inFlight.current = true; setPending(true); setError(null);
    let succeeded = false;
    try {
      const response = await fetch("/api/account", { method: "DELETE" });
      if (response.status === 401) { router.replace("/login"); return; }
      if (response.status !== 204) {
        const parsed = errorSchema.safeParse(await response.json());
        setError(parsed.success ? parsed.data.error.code : "internal_error");
        return;
      }
      succeeded = true; setCompleted(true);
      router.replace("/"); router.refresh();
    } catch {
      setError("internal_error");
    } finally {
      if (!succeeded) { inFlight.current = false; setPending(false); }
    }
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-(--scrim) p-5" onClick={(event) => { if (event.target === event.currentTarget && !inFlight.current) onClose(); }}>
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="withdrawal-title" aria-describedby="withdrawal-description" aria-busy={pending && !completed} tabIndex={-1} className="flex max-h-[calc(100dvh-40px)] w-full max-w-[440px] flex-col gap-4 overflow-y-auto bg-canvas p-8 outline-none">
      <h2 id="withdrawal-title" className="text-2xl leading-[1.2] font-medium">회원 탈퇴</h2>
      <p id="withdrawal-description" className="text-mute">아래 순서로 처리되며 되돌릴 수 없습니다.</p>
      <ol className="my-2 flex flex-col gap-3">{steps.map((step, index) => {
        const done = completed || (failedStep !== undefined && index < failedStep);
        const failed = failedStep === index;
        return <li key={step} aria-label={`${step}: ${done ? "완료" : failed ? "실패" : "대기"}`} className={`flex items-center gap-3 ${done ? "text-charcoal" : failed ? "text-sale" : "text-stone"}`}>
          <span className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border ${done ? "border-ink bg-ink text-on-primary" : failed ? "border-sale" : "border-hairline"}`}>
            {done ? <Icon name="check" size={14} /> : failed ? <Icon name="x" size={14} /> : null}
          </span>{step}
        </li>;
      })}</ol>
      {error && <p role="alert" className="text-sm text-sale">{failedStep !== undefined && `${steps[failedStep]} 단계에서 중단되었습니다. `}{ERROR_MESSAGES[error]}</p>}
      <Field id="withdrawal-confirmation" label="확인을 위해 '탈퇴'를 입력하세요" value={text} onChange={(event) => setText(event.target.value)} disabled={pending} autoComplete="off" />
      <div className="flex items-center justify-end gap-3">
        <Button variant="secondary" size="sm" disabled={pending} onClick={onClose}>취소</Button>
        <Button size="sm" disabled={text !== "탈퇴" || pending} onClick={withdraw}>{completed ? "탈퇴 완료" : pending ? "탈퇴 처리 중…" : error ? "다시 시도" : "탈퇴하기"}</Button>
      </div>
    </div>
  </div>;
}
