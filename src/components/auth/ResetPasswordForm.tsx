"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/browser";
import { authErrorCode, authUrl, isEmail } from "@/lib/auth-flow";
import { AUTH_ERROR_MESSAGES } from "@/messages/errors";
import type { AuthErrorCode } from "@/types/errors";
import { AuthFeedback, AuthShell } from "./AuthShell";

export function ResetPasswordForm({ canUpdatePassword }: { canUpdatePassword: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<AuthErrorCode>();
  const [error, setError] = useState<AuthErrorCode>();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const validation: AuthErrorCode | undefined = canUpdatePassword
      ? (password.length < 8 ? "password_too_short" : undefined)
      : (!isEmail(email) ? "invalid_email" : undefined);
    setFieldError(validation);
    if (validation) return;
    setBusy(true);
    setError(undefined);
    try {
      const supabase = createClient();
      if (canUpdatePassword) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) setError(authErrorCode(error));
        else { router.replace("/dashboard"); router.refresh(); }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: authUrl("/auth/confirm?next=/reset-password") });
        if (error) setError(authErrorCode(error));
        else setSent(true);
      }
    } catch {
      setError("auth_failed");
    } finally {
      setBusy(false);
    }
  }

  return <AuthShell>
    <h1 className="text-2xl font-medium leading-tight">비밀번호 재설정</h1>
    {sent ? <>
      <p className="text-mute"><b className="break-all text-ink">{email.trim()}</b> 메일함으로 재설정 링크를 보냈습니다.</p>
      <Button fullWidth href="/login">로그인으로 돌아가기</Button>
    </> : <form noValidate onSubmit={submit} className="flex flex-col gap-4" aria-busy={busy}>
      <p className="text-mute">{canUpdatePassword ? "새 비밀번호를 입력해 주세요." : "가입한 이메일로 재설정 링크를 보내드립니다."}</p>
      {canUpdatePassword
        ? <Field id="reset-password" label="새 비밀번호" type="password" autoComplete="new-password" hint="8자 이상" value={password} disabled={busy} onChange={(event) => setPassword(event.target.value)} error={fieldError && AUTH_ERROR_MESSAGES[fieldError]} />
        : <Field id="reset-email" label="이메일" type="email" autoComplete="email" placeholder="name@example.com" value={email} disabled={busy} onChange={(event) => { setEmail(event.target.value); setFieldError(undefined); }} onBlur={() => setFieldError(isEmail(email) ? undefined : "invalid_email")} error={fieldError && AUTH_ERROR_MESSAGES[fieldError]} />}
      <AuthFeedback error={error} />
      <Button type="submit" fullWidth disabled={busy || (!canUpdatePassword && !isEmail(email))}>{busy ? "처리 중" : canUpdatePassword ? "비밀번호 변경" : "링크 보내기"}</Button>
      <p className="text-center text-sm"><Link href="/login">로그인으로 돌아가기</Link></p>
    </form>}
  </AuthShell>;
}
