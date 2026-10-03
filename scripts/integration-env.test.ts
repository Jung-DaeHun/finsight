// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { integrationEnv } from "./integration-env";

const dirs: string[] = [];
function fixture(live?: string) {
  const dir = mkdtempSync(join(tmpdir(), "finsight-integration-"));
  dirs.push(dir);
  writeFileSync(join(dir, ".env.local"), "NEXT_PUBLIC_SUPABASE_URL=https://dev.supabase.co\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-public\nSUPABASE_SECRET_KEY=test-secret\n");
  if (live) writeFileSync(join(dir, ".env.go-live.local"), `NEXT_PUBLIC_SUPABASE_URL=${live}\n`);
  return dir;
}
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  vi.unstubAllEnvs();
});
describe("통합 테스트 운영 프로젝트 차단", () => {
  it("운영 URL과 같으면 연결 전에 실패한다(슬래시·대소문자 포함)", () => {
    expect(() => integrationEnv(fixture("https://DEV.supabase.co/"))).toThrow("운영 Supabase");
  });
  it("셸 환경 변수보다 개발용 파일을 우선하고 비밀번호는 전달하지 않는다", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://prod.supabase.co");
    const env = integrationEnv(fixture("https://prod.supabase.co"));
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://dev.supabase.co");
    expect(env).not.toHaveProperty("SUPABASE_DB_PASSWORD");
  });
  it("운영 파일이 없어도 개발 파일만 사용한다", () => {
    expect(integrationEnv(fixture()).NEXT_PUBLIC_SUPABASE_URL).toBe("https://dev.supabase.co");
  });
  it("필수 개발 키가 없으면 실패한다", () => {
    const dir = fixture();
    writeFileSync(join(dir, ".env.local"), "NEXT_PUBLIC_SUPABASE_URL=https://dev.supabase.co");
    expect(() => integrationEnv(dir)).toThrow("설정이 필요합니다");
  });
});
