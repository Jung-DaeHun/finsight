import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { classifyMerchants, mapColumns, modelFor } from "../src/services/claude";
import type { Plan } from "../src/types";

type Services = { mapColumns: typeof mapColumns; classifyMerchants: typeof classifyMerchants };

/** go-live에서 실제 API 응답 시간을 재기 위한 스크립트. 이 step에서는 실행하지 않는다. */
export async function measureClaude(
  services: Services = { mapColumns, classifyMerchants },
  now: () => number = () => performance.now(),
  write: (line: string) => void = (line) => { process.stdout.write(line); },
): Promise<void> {
  const header = ["거래일", "가맹점", "이용금액"];
  const samples = [["2026-09-01", "예시상점", "12000"]];
  const merchants = Array.from({ length: 100 }, (_, index) => `가맹점-${index + 1}`);
  for (const plan of ["free", "pro"] as const satisfies readonly Plan[]) {
    const model = modelFor(plan);
    const mappingStarted = now();
    await services.mapColumns(header, samples, plan);
    write(`${model} 매핑: ${Math.round(now() - mappingStarted)} ms\n`);
    const classifyStarted = now();
    await services.classifyMerchants(merchants, plan);
    write(`${model} 가맹점 100개 분류: ${Math.round(now() - classifyStarted)} ms\n`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (!process.env.ANTHROPIC_API_KEY || (process.env.MOCK_SERVICES ?? "").split(",").map((name) => name.trim()).includes("claude")) {
    process.stderr.write("실측에는 ANTHROPIC_API_KEY와 실제 Claude 모드가 필요합니다.\n");
    process.exitCode = 1;
  } else {
    measureClaude().catch(() => {
      process.stderr.write("Claude 실측 호출이 실패했습니다.\n");
      process.exitCode = 1;
    });
  }
}
