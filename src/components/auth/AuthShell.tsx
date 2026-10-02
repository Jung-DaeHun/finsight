import type { ReactNode } from "react";
import { Wordmark } from "@/components/ui/Wordmark";
import { AUTH_ERROR_MESSAGES } from "@/messages/errors";
import type { AuthErrorCode } from "@/types/errors";

export function AuthShell({ children }: { children: ReactNode }) {
  return <main className="flex min-h-screen flex-col items-center bg-soft-cloud px-5 pb-12">
    <div className="flex h-20 shrink-0 items-center"><Wordmark /></div>
    <div className="flex w-full max-w-[420px] flex-col gap-4 bg-canvas p-9">{children}</div>
  </main>;
}

export function GoogleButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="flex h-12 w-full items-center justify-center gap-2.5 rounded-pill border border-hairline bg-canvas font-medium text-ink disabled:cursor-not-allowed disabled:bg-hairline-soft disabled:text-stone">
    <span aria-hidden="true" className="font-heading font-bold leading-none">G</span>Google로 계속하기
  </button>;
}

export function EmailDivider() {
  return <div className="flex items-center gap-3 text-xs text-mute before:h-px before:flex-1 before:bg-hairline-soft after:h-px after:flex-1 after:bg-hairline-soft"><span>또는 이메일</span></div>;
}

export function AuthFeedback({ error, notice }: { error?: AuthErrorCode; notice?: string }) {
  return <>
    {error && <p role="alert" className="text-xs text-sale">{AUTH_ERROR_MESSAGES[error]}</p>}
    {notice && <p role="status" className="text-xs text-mute">{notice}</p>}
  </>;
}
