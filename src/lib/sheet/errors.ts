import type { AnalysisErrorCode } from "@/types/errors";

export class SheetError extends Error {
  constructor(public readonly code: AnalysisErrorCode) {
    super(code);
    this.name = "SheetError";
  }
}
