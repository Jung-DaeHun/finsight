import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";

/** 통합 테스트를 허용하는 개발 Supabase 프로젝트(finsight-dev). 공개 URL의 일부라 비밀이 아니다. */
export const DEV_PROJECT_REF = "wkthhsfwhzehrtsvfefu";

/** 네트워크 요청 전에 개발 파일만 읽고, 허용한 개발 프로젝트가 아니면 차단한다. */
export function integrationEnv(root: string): Record<string, string> {
  const dev = parseEnv(readFileSync(resolve(root, ".env.local"), "utf8"));
  const required: Record<string, string> = {};
  for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY"]) {
    const value = dev[key];
    if (!value?.trim()) throw new Error(`개발용 .env.local에 ${key} 설정이 필요합니다.`);
    required[key] = value;
  }
  // 운영 파일 유무와 관계없이 허용 목록으로 판단해, .env.local에 운영 값이 들어가도 연결하지 않는다.
  if (new URL(required.NEXT_PUBLIC_SUPABASE_URL).hostname !== `${DEV_PROJECT_REF}.supabase.co`) {
    throw new Error(`개발 Supabase 프로젝트(${DEV_PROJECT_REF})가 아니면 통합 테스트를 실행할 수 없습니다.`);
  }
  return required;
}
