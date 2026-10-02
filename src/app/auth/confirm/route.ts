import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { confirmationNext } from "@/lib/auth-flow";

const emailTypes: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  let destination: string = "/login?error=auth_link_expired";
  if (tokenHash && type && emailTypes.some((allowed) => allowed === type)) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType });
      if (!error) destination = confirmationNext(params.get("next"));
    } catch {
      // 다른 기기의 링크도 token_hash만으로 확인하며, 토큰은 로그에 남기지 않는다.
    }
  }
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
