export function DemoBanner({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;
  return <div className="bg-ink px-5 py-2 text-center text-xs font-medium text-on-primary">데모 모드</div>;
}
