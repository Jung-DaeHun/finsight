// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEV_PROJECT_REF, integrationEnv } from "./integration-env";

const devUrl = `https://${DEV_PROJECT_REF}.supabase.co`;
const dirs: string[] = [];
function fixture(url = devUrl) {
  const dir = mkdtempSync(join(tmpdir(), "finsight-integration-"));
  dirs.push(dir);
  writeFileSync(join(dir, ".env.local"), `NEXT_PUBLIC_SUPABASE_URL=${url}\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-public\nSUPABASE_SECRET_KEY=test-secret\n`);
  return dir;
}
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  vi.unstubAllEnvs();
});
describe("통합 테스트 운영 프로젝트 차단", () => {
  it.each(["https://prod.supabase.co", "https://db.example.com", `https://${DEV_PROJECT_REF}.example.com`])(
    "운영 파일이 없어도 허용한 개발 프로젝트가 아닌 %s에는 연결 전에 실패한다", (url) => {
      expect(() => integrationEnv(fixture(url))).toThrow("개발 Supabase 프로젝트");
    },
  );
  it("개발 프로젝트 URL은 슬래시·대소문자와 관계없이 허용한다", () => {
    expect(integrationEnv(fixture(`https://${DEV_PROJECT_REF.toUpperCase()}.supabase.co/`)).SUPABASE_SECRET_KEY).toBe("test-secret");
  });
  it("셸 환경 변수보다 개발용 파일을 우선하고 비밀번호는 전달하지 않는다", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://prod.supabase.co");
    const env = integrationEnv(fixture());
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe(devUrl);
    expect(env).not.toHaveProperty("SUPABASE_DB_PASSWORD");
  });
  it("필수 개발 키가 없으면 실패한다", () => {
    const dir = fixture();
    writeFileSync(join(dir, ".env.local"), `NEXT_PUBLIC_SUPABASE_URL=${devUrl}`);
    expect(() => integrationEnv(dir)).toThrow("설정이 필요합니다");
  });
});
