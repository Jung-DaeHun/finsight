export type ClaudeErrorCode = "llm_unavailable" | "timeout" | "mapping_failed";

export class ClaudeServiceError extends Error {
  constructor(public readonly code: ClaudeErrorCode) {
    super(code);
    this.name = "ClaudeServiceError";
  }
}
