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
  return <button type="button" disabled={disabled} onClick={onClick} className="group flex h-12 w-full items-center justify-center gap-2.5 rounded-pill border border-hairline bg-canvas font-medium text-ink disabled:cursor-not-allowed disabled:bg-hairline-soft disabled:text-stone">
    {/* Google 브랜딩 가이드의 공식 G 로고 */}
    <svg aria-hidden="true" viewBox="0 0 48 48" className="size-[18px] group-disabled:opacity-40 group-disabled:grayscale">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
    Google로 계속하기
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
