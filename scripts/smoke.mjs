import { readFile } from "node:fs/promises";

try {
  const { prodUrl } = JSON.parse(
    await readFile(new URL("../deploy.config.json", import.meta.url), "utf8"),
  );
  const response = await fetch(prodUrl, {
    signal: AbortSignal.timeout(30_000),
  });

  process.stdout.write(`HTTP ${response.status} ${prodUrl}\n`);
  if (response.status !== 200) {
    process.exitCode = 1;
  }
} catch {
  process.stderr.write("배포 설정을 읽거나 운영 도메인에 연결하지 못했습니다.\n");
  process.exitCode = 1;
}
