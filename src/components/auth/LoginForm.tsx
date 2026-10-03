"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/browser";
import { authErrorCode, authUrl, isEmail, validateCredentials } from "@/lib/auth-flow";
import { AUTH_ERROR_MESSAGES } from "@/messages/errors";
import type { AuthErrorCode } from "@/types/errors";
import { AuthFeedback, AuthShell, EmailDivider, GoogleButton } from "./AuthShell";

export function LoginForm({ initialError }: { initialError?: AuthErrorCode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<ReturnType<typeof validateCredentials>>({});
  const [error, setError] = useState(initialError);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [canResend, setCanResend] = useState(initialError === "auth_link_expired" || initialError === "email_not_confirmed");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const validation = validateCredentials(email, password);
    setErrors(validation);
    if (Object.keys(validation).length) return;
    setBusy(true);
    setError(undefined);
    setNotice("");
    try {
      const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setError(authErrorCode(error));
        setCanResend(error.code === "email_not_confirmed");
      }
      else {
        router.replace("/dashboard");
        router.refresh();
      }
    } catch {
      setError("auth_failed");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const { error } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: authUrl("/auth/callback") } });
      if (error) setError("oauth_failed");
    } catch {
      setError("oauth_failed");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (busy) return;
    if (!isEmail(email)) { setErrors({ email: "invalid_email" }); return; }
    setBusy(true);
    setNotice("");
    try {
      const { error } = await createClient().auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: authUrl("/auth/confirm") } });
      if (error) setError(authErrorCode(error));
      else setNotice("인증 메일을 다시 보냈습니다. 메일함을 확인해 주세요.");
    } catch {
      setError("auth_failed");
    } finally {
      setBusy(false);
    }
  }

  return <AuthShell><form noValidate onSubmit={submit} className="flex flex-col gap-4" aria-busy={busy}>
    <h1 className="text-2xl font-medium leading-tight">로그인</h1>
    <GoogleButton disabled={busy} onClick={google} />
    <EmailDivider />
    <Field id="login-email" label="이메일" type="email" autoComplete="email" placeholder="name@example.com" value={email} disabled={busy} onChange={(event) => setEmail(event.target.value)} error={errors.email && AUTH_ERROR_MESSAGES[errors.email]} />
    <Field id="login-password" label="비밀번호" type="password" autoComplete="current-password" value={password} disabled={busy} onChange={(event) => setPassword(event.target.value)} error={errors.password && AUTH_ERROR_MESSAGES[errors.password]} />
    <Link href="/reset-password" className="self-end text-sm font-medium">비밀번호를 잊으셨나요?</Link>
    <AuthFeedback error={error} notice={notice} />
    {canResend && <Button variant="secondary" fullWidth disabled={busy} onClick={resend}>인증 메일 다시 보내기</Button>}
    <Button type="submit" fullWidth disabled={busy}>{busy ? "로그인 중" : "로그인"}</Button>
    <p className="text-center text-sm text-mute">계정이 없으신가요? <Link href="/signup" className="text-ink">회원가입</Link></p>
  </form></AuthShell>;
}
