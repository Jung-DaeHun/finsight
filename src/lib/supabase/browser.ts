import { createBrowserClient } from "@supabase/ssr";

/** 브라우저에서는 인증에만 사용한다. 테이블 접근은 lib/data에서 수행한다. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookieOptions: { sameSite: "lax" } },
  );
}
