export function logError(
  event: string,
  meta: { code?: string; analysisId?: string; durationMs?: number },
): void {
  // 구조적 타입 호환으로 추가 속성이 있는 변수가 들어와도 기록하지 않는다.
  const safeMeta: { code?: string; analysisId?: string; durationMs?: number } = {};
  if (meta.code !== undefined) safeMeta.code = meta.code;
  if (meta.analysisId !== undefined) safeMeta.analysisId = meta.analysisId;
  if (meta.durationMs !== undefined) safeMeta.durationMs = meta.durationMs;

  console.error(event, safeMeta);
}
