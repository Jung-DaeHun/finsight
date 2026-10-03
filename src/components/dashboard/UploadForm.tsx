"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { getFailedUploadFilename } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { formatBytes } from "@/lib/format";
import { limits } from "@/lib/plan";
import { ERROR_MESSAGES, UPLOAD_ERROR_MESSAGES } from "@/messages/errors";
import type { Plan } from "@/types";
import { ANALYSIS_ERROR_CODES, API_ERROR_CODES } from "@/types/errors";
import { Analyzing } from "./Analyzing";

const successSchema = z.object({ analysisId: z.string().min(1) });
const errorSchema = z.object({ error: z.object({
  code: z.enum([...ANALYSIS_ERROR_CODES, ...API_ERROR_CODES]),
  analysisId: z.string().optional(), uploadId: z.string().optional(),
}) });
type Feedback = { text: string; filename?: string; upgrade?: boolean; refresh?: boolean };

export function UploadForm({ plan, used, limit, maxFiles }: { plan: Plan; used: number; limit: number; maxFiles: number }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const pending = useRef(false);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<Feedback | null>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const over = used >= limit;
  const startLabel = files.length > 1 ? `분석 시작 (${files.length}개 파일)` : "분석 시작";

  function addFiles(incoming: File[]) {
    if (pending.current) return;
    setError(null);
    const next = [...files];
    for (const file of incoming) {
      if (!/\.(csv|xlsx|xls)$/i.test(file.name)) {
        setError({ text: UPLOAD_ERROR_MESSAGES.unsupported_file_type, filename: file.name });
        return;
      }
      if (file.size > limits(plan).maxBytesPerFile) {
        setError({ text: ERROR_MESSAGES.file_too_large, filename: file.name });
        return;
      }
      next.push(file);
      if (next.length > maxFiles) {
        setError({ text: ERROR_MESSAGES.too_many_files, filename: file.name, upgrade: plan === "free" });
        return;
      }
    }
    setFiles(next);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || over || files.length === 0) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    try {
      const response = await fetch("/api/analyses", { method: "POST", body: form });
      if (response.status === 401) { router.push("/login"); return; }
      const body: unknown = await response.json();
      if (response.status === 201) {
        const result = successSchema.parse(body);
        router.push(`/dashboard/analyses/${encodeURIComponent(result.analysisId)}`);
        return;
      }
      const parsed = errorSchema.safeParse(body);
      if (!parsed.success) throw new Error("invalid_response");
      const { code, analysisId, uploadId } = parsed.data.error;
      let filename: string | null = null;
      if (analysisId && uploadId) {
        try { filename = await getFailedUploadFilename(analysisId, uploadId); }
        catch { /* 파일명 조회가 실패해도 원래 분석 오류를 유지한다. */ }
      }
      setError({ text: ERROR_MESSAGES[code], ...(filename ? { filename } : {}), upgrade: code === "too_many_files" && plan === "free" });
      router.refresh();
    } catch {
      setError({ text: UPLOAD_ERROR_MESSAGES.response_unavailable, refresh: true });
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return <section id="upload" aria-label="새 분석" className="mx-auto max-w-[880px] scroll-mt-32">
    {busy ? <>
      <Analyzing filenames={files.map((file) => file.name)} />
      <div className="mt-8 flex justify-center"><Button disabled>{startLabel}</Button></div>
    </> : <form onSubmit={submit}>
      <div className="mb-8">
        <h2 className="text-[32px] font-medium leading-tight">새 분석</h2>
        <p className="mt-2 text-mute">{plan === "pro" ? "파일 최대 3개 · 여러 카드·계좌를 합쳐 분석" : "파일 1개 · Pro는 최대 3개"}</p>
      </div>
      <button type="button" aria-label="파일을 끌어다 놓거나 클릭해서 선택" className={`flex w-full flex-col items-center gap-2 px-6 py-14 text-center ${drag ? "border-2 border-ink bg-canvas" : "border border-dashed border-stone bg-soft-cloud"}`}
        onClick={() => input.current?.click()}
        onDragOver={(event) => { event.preventDefault(); setDrag(true); }}
        onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDrag(false); }}
        onDrop={(event) => { event.preventDefault(); setDrag(false); addFiles(Array.from(event.dataTransfer.files)); }}>
        <Icon name="upload" size={28} />
        <span className="font-medium">파일을 끌어다 놓거나 클릭해서 선택</span>
        <span className="text-sm font-medium text-mute">CSV · xlsx · xls(HTML 표 포함) · UTF-8/EUC-KR · 파일당 1MB, 시트 1,200행까지</span>
      </button>
      <input ref={input} type="file" accept=".csv,.xlsx,.xls" multiple aria-label="명세서 파일 선택" className="hidden" onChange={(event) => {
        addFiles(Array.from(event.currentTarget.files ?? []));
        event.currentTarget.value = "";
      }} />
      <details className="group mt-3">
        <summary className="flex min-h-9 w-fit cursor-pointer list-none items-center gap-1.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
          <Icon name="chevron-down" size={16} className="shrink-0 transition-transform duration-150 group-open:rotate-180" />
          명세서 파일은 어디서 받나요?
        </summary>
        <ol className="mt-1 mb-2 flex list-decimal flex-col gap-1 pl-[22px] text-sm text-charcoal">
          <li>카드사·은행 앱이나 홈페이지에 로그인합니다.</li>
          <li>이용내역(거래내역) 조회 메뉴를 엽니다.</li>
          <li>분석할 기간을 선택합니다.</li>
          <li>엑셀 또는 CSV 파일로 저장합니다.</li>
        </ol>
      </details>
      {error && <div role="alert" className="mt-3 flex flex-wrap items-start gap-3 border border-sale p-4">
        <Icon name="alert-circle" size={18} className="mt-0.5 shrink-0 text-sale" />
        <div className="min-w-0 flex-1 basis-[180px]">
          {error.filename && <p className="break-all font-medium">{error.filename}</p>}
          <p className="text-sm font-medium">{error.text}</p>
        </div>
        {error.upgrade && <Button href="/api/checkout" size="sm">Pro로 업그레이드</Button>}
        {error.refresh && <Button size="sm" variant="secondary" onClick={() => router.refresh()}>대시보드 새로고침</Button>}
      </div>}
      {files.length > 0 && <ul aria-label="선택한 파일" className="mt-4">{files.map((file, index) => <li key={`${file.name}-${index}`} className="flex items-center gap-3 border-b border-hairline-soft py-2">
        <Icon name="file-spreadsheet" size={20} className="shrink-0" />
        <span className="min-w-0 flex-1 break-all">{file.name}<span className="text-sm font-medium text-mute"> · {formatBytes(file.size)}</span></span>
        <IconButton icon="x" variant="ghost" size={36} aria-label={`${file.name} 제거`} onClick={() => { setFiles(files.filter((_, selected) => selected !== index)); setError(null); }} />
      </li>)}</ul>}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-6 border-t border-hairline pt-5">
        <div className="max-w-[440px] text-sm font-medium text-mute">
          <p><Icon name="lock" size={14} className="mr-1 inline align-[-2px]" />올린 원본 파일은 본인만 접근할 수 있는 비공개 스토리지에 저장됩니다. 설정에서 분석을 삭제하거나 탈퇴하면 함께 삭제됩니다.</p>
          <p className="mt-2">첫 시트만 읽습니다. <Link href="/privacy" className="text-ink underline">개인정보 처리방침</Link></p>
        </div>
        <Button type="submit" disabled={over || files.length === 0} className="max-w-full max-[600px]:h-auto max-[600px]:min-h-12 max-[600px]:whitespace-normal max-[600px]:py-3">{over ? "이번 달 분석 횟수를 모두 사용했습니다" : startLabel}</Button>
      </div>
      {over && <div className="mt-3 flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-right text-sm font-medium text-mute">
        <div>
          <p>{ERROR_MESSAGES.monthly_limit}</p>
          {plan === "free" && <p>Pro는 매월 {limits("pro").monthlyAnalyses}회까지 분석할 수 있습니다.</p>}
        </div>
        {plan === "free" && <Button href="/api/checkout" size="sm">Pro로 업그레이드</Button>}
      </div>}
    </form>}
  </section>;
}
