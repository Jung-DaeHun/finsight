import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores([
    ".next/**",
    "node_modules/**",
    ".vercel/**",
    "coverage/**",
    "out/**",
    "docs/**",
    "scripts/**",
    "phases/**",
    ".claude/**",
    ".codex/**",
    "next-env.d.ts",
  ]),
]);
