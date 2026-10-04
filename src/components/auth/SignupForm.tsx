"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/browser";
import { authErrorCode, authUrl, validateCredentials } from "@/lib/auth-flow";
import { AUTH_ERROR_MESSAGES } from "@/messages/errors";
import type { AuthErrorCode } from "@/types/errors";
import { AuthFeedback, AuthShell, EmailDivider, GoogleButton } from "./AuthShell";
import { VerifySent } from "./VerifySent";

export function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  const [transfer, setTransfer] = useState(false);
  const [errors, setErrors] = useState<ReturnType<typeof validateCredentials> & { passwordConfirm?: AuthErrorCode; consent?: AuthErrorCode }>({});
  const [error, setError] = useState<AuthErrorCode>();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const agreed = terms && transfer;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const validation = {
      ...validateCredentials(email, password),
      ...(password !== passwordConfirm && { passwordConfirm: "password_mismatch" as const }),
      ...(!agreed && { consent: "consent_required" as const }),
    };
    setErrors(validation);
    if (Object.keys(validation).length) return;
    setBusy(true);
    setError(undefined);
    try {
      const { error } = await createClient().auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: authUrl("/auth/confirm") } });
      // 기존 계정에 대한 identities·user 데이터는 계정 열거 방지를 위해 사용하지 않는다.
      if (error && error.code !== "user_already_exists") setError(authErrorCode(error));
      else { setPassword(""); setPasswordConfirm(""); setSent(true); }
    } catch {
      setError("auth_failed");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    if (busy) return;
    if (!agreed) { setErrors({ consent: "consent_required" }); return; }
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

  if (sent) return <AuthShell><VerifySent email={email.trim()} /></AuthShell>;
  return <AuthShell><form noValidate onSubmit={submit} className="flex flex-col gap-4" aria-busy={busy}>
    <h1 className="text-2xl font-medium leading-tight">회원가입</h1>
    <GoogleButton disabled={!agreed || busy} onClick={google} describedBy={agreed ? undefined : "google-consent-hint"} />
    {!agreed && <p id="google-consent-hint" className="-mt-2 text-center text-sm font-medium text-mute">아래 필수 항목에 동의하면 사용할 수 있습니다.</p>}
    <EmailDivider />
    <Field id="signup-email" label="이메일" type="email" autoComplete="email" placeholder="name@example.com" value={email} disabled={busy} onChange={(event) => setEmail(event.target.value)} error={errors.email && AUTH_ERROR_MESSAGES[errors.email]} />
    <Field id="signup-password" label="비밀번호" type="password" autoComplete="new-password" value={password} disabled={busy} onChange={(event) => setPassword(event.target.value)} hint="8자 이상" error={errors.password && AUTH_ERROR_MESSAGES[errors.password]} />
    <Field id="signup-password-confirm" label="비밀번호 확인" type="password" autoComplete="new-password" value={passwordConfirm} disabled={busy} onChange={(event) => setPasswordConfirm(event.target.value)} error={errors.passwordConfirm && AUTH_ERROR_MESSAGES[errors.passwordConfirm]} />
    <div className="flex flex-col gap-2.5 bg-soft-cloud p-4" role="group" aria-label="필수 동의" aria-describedby={errors.consent ? "consent-error" : undefined}>
      <label className="flex cursor-pointer items-start gap-2.5 text-sm font-medium">
        <input type="checkbox" checked={terms} disabled={busy} onChange={(event) => setTerms(event.target.checked)} className="mt-[3px] size-4 shrink-0 accent-ink" />
        <span>[필수] <Link href="/terms" className="underline">이용약관</Link> 및 <Link href="/privacy" className="underline">개인정보 수집·이용</Link>에 동의합니다.</span>
      </label>
      <label className="flex cursor-pointer items-start gap-2.5 text-sm font-medium">
        <input type="checkbox" checked={transfer} disabled={busy} onChange={(event) => setTransfer(event.target.checked)} className="mt-[3px] size-4 shrink-0 accent-ink" />
        <span>[필수] 개인정보 국외 이전에 동의합니다.<span className="block text-xs text-mute">분석·결제·호스팅을 위해 Anthropic(미국), Polar(미국), Vercel(미국)로 이전됩니다.</span></span>
      </label>
      {errors.consent && <p id="consent-error" className="text-xs text-sale">{AUTH_ERROR_MESSAGES[errors.consent]}</p>}
    </div>
    <AuthFeedback error={error} />
    <Button type="submit" fullWidth disabled={!agreed || busy}>{busy ? "가입 중" : "가입하기"}</Button>
    <p className="text-center text-sm text-mute">이미 계정이 있으신가요? <Link href="/login" className="text-ink">로그인</Link></p>
  </form></AuthShell>;
}
