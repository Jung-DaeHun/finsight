import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { classifyMerchants, mapColumns, modelFor } from "../src/services/claude";
import { CLASSIFY_BATCH_SIZE, CLASSIFY_CONCURRENCY } from "../src/services/claude-config";
import { limits } from "../src/lib/plan";
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
    const mappingMs = now() - mappingStarted;
    write(`${model} 매핑: ${Math.round(mappingMs)} ms\n`);
    const classifyStarted = now();
    await services.classifyMerchants(merchants, plan);
    const classifyMs = now() - classifyStarted;
    write(`${model} 가맹점 100개 분류: ${Math.round(classifyMs)} ms\n`);
    // 최대 입력은 파일마다 매핑 1회, 모든 행이 고유 가맹점이라고 보고 배치를 동시 호출 수만큼 나눠 실행한다.
    const { maxFiles, maxSheetRows } = limits(plan);
    const rows = maxFiles * maxSheetRows;
    const rounds = Math.ceil(Math.ceil(rows / CLASSIFY_BATCH_SIZE) / CLASSIFY_CONCURRENCY);
    const estimateMs = Math.round(maxFiles * mappingMs + rounds * classifyMs);
    write(`${model} 최대 입력(${maxFiles}파일·${rows.toLocaleString("en-US")}행) 예상: ${estimateMs} ms (${estimateMs <= 240_000 ? "240초 이내" : "240초 초과"})\n`);
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
