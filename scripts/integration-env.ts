import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";

/** 네트워크 요청 전에 개발 파일만 읽고 운영 프로젝트 접근을 차단한다. */
export function integrationEnv(root: string): Record<string, string> {
  const dev = parseEnv(readFileSync(resolve(root, ".env.local"), "utf8"));
  const livePath = resolve(root, ".env.go-live.local");
  const live = existsSync(livePath) ? parseEnv(readFileSync(livePath, "utf8")) : {};
  const required: Record<string, string> = {};
  for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY"]) {
    const value = dev[key];
    if (!value?.trim()) throw new Error(`개발용 .env.local에 ${key} 설정이 필요합니다.`);
    required[key] = value;
  }
  const host = new URL(required.NEXT_PUBLIC_SUPABASE_URL).hostname;
  if (live.NEXT_PUBLIC_SUPABASE_URL && new URL(live.NEXT_PUBLIC_SUPABASE_URL).hostname === host) {
    throw new Error("운영 Supabase 프로젝트에는 통합 테스트를 실행할 수 없습니다.");
  }
  return required;
}
