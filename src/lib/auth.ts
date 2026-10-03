import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const sub = data?.claims.sub;
  return !error && typeof sub === "string" && sub.length > 0 ? sub : null;
}
