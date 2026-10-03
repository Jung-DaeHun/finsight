"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { createClient } from "@/lib/supabase/browser";
import { authErrorCode, authUrl } from "@/lib/auth-flow";
import type { AuthErrorCode } from "@/types/errors";
import { AuthFeedback } from "./AuthShell";

export function VerifySent({ email }: { email: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthErrorCode>();
  const [notice, setNotice] = useState("");

  async function resend() {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    setNotice("");
    try {
      const { error } = await createClient().auth.resend({ type: "signup", email, options: { emailRedirectTo: authUrl("/auth/confirm") } });
      if (error) setError(authErrorCode(error));
      else setNotice("인증 메일을 다시 보냈습니다. 메일함을 확인해 주세요.");
    } catch {
      setError("auth_failed");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <div className="flex size-11 items-center justify-center rounded-[18px] bg-soft-cloud"><Icon name="mail" size={22} /></div>
    <h1 className="text-2xl font-medium leading-tight">메일함을 확인해 주세요</h1>
    <p className="text-mute"><b className="break-all text-ink">{email}</b> 메일함으로 인증 링크를 보냈습니다. 링크를 열면 가입이 완료됩니다. 다른 기기에서 열어도 됩니다.</p>
    <AuthFeedback error={error} notice={notice} />
    <p className="text-sm font-medium text-mute">메일이 오지 않으면 스팸함을 확인해 주세요.</p>
    <Button variant="secondary" fullWidth disabled={busy} onClick={resend}>인증 메일 다시 보내기</Button>
  </>;
}
