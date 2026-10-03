import { getUserId } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/data";
import { apiError } from "@/lib/api-error";
import { logError } from "@/lib/log";
import { createCheckout } from "@/services/polar";

export async function GET(): Promise<Response> {
  try {
    const userId = await getUserId();
    if (!userId) return apiError("unauthorized", 401);
    if (await getUserPlan(userId) === "pro") return apiError("already_pro", 409);
    const { data, error } = await (await createClient()).auth.getClaims();
    const email = data?.claims.email;
    if (error || data?.claims.sub !== userId || typeof email !== "string" || !email) return apiError("unauthorized", 401);
    const url = await createCheckout(userId, email);
    return new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "private, no-store" } });
  } catch {
    logError("checkout_failed", { code: "internal_error" });
    return apiError("internal_error", 502);
  }
}
