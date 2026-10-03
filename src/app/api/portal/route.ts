import { getUserId } from "@/lib/auth";
import { apiError } from "@/lib/api-error";
import { logError } from "@/lib/log";
import { createPortalUrl } from "@/services/polar";

export async function GET(): Promise<Response> {
  try {
    const userId = await getUserId();
    if (!userId) return apiError("unauthorized", 401);
    const url = await createPortalUrl(userId);
    if (!url) return apiError("not_found", 404);
    return new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "private, no-store" } });
  } catch {
    logError("portal_failed", { code: "internal_error" });
    return apiError("internal_error", 502);
  }
}
