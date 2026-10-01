export function isMocked(service: "claude" | "polar"): boolean {
  return (process.env.MOCK_SERVICES ?? "")
    .split(",")
    .map((name) => name.trim())
    .includes(service);
}
