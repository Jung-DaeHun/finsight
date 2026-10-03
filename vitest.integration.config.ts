import { defineConfig } from "vitest/config";
import { integrationEnv } from "./scripts/integration-env";

export default defineConfig({
  test: {
    environment: "node",
    include: ["supabase/**/*.integration.test.ts"],
    env: integrationEnv(process.cwd()),
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
