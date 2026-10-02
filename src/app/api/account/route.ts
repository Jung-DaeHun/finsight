import { getUserId } from "@/lib/auth";
import { apiError } from "@/lib/api-error";
import { logError } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";
import { deleteAccount } from "@/services/deletion";
import { AccountDeletionError } from "@/types/errors";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function DELETE(): Promise<Response> {
  const startedAt = Date.now();
  try {
    const userId = await getUserId();
    if (!userId) return apiError("unauthorized", 401);
    const supabase = await createClient();
    const cookieStore = await cookies();
    const storageKey = `sb-${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0]}-auth-token`;
    const authCookies = cookieStore.getAll().filter(({ name }) => name === storageKey || name.startsWith(`${storageKey}.`) || name.startsWith(`${storageKey}-`));
    await deleteAccount(userId);
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) logError("account_signout_failed", { code: "internal_error" });
    } catch {
      logError("account_signout_failed", { code: "internal_error" });
    }
    // 삭제는 이미 끝났다. 로그아웃 네트워크 오류가 나도 이 앱의 세션 쿠키는 정리한다.
    for (const { name } of authCookies) cookieStore.set(name, "", { path: "/", maxAge: 0 });
    return new Response(null, { status: 204, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const code = error instanceof AccountDeletionError ? error.code : "account_delete_failed";
    logError("account_delete_failed", { code, durationMs: Date.now() - startedAt });
    return apiError(code, 502);
  }
}
