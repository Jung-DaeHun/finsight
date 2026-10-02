import { Button } from "./Button";
import { Icon } from "./Icon";
export function LockCard({ title, description }: { title: string; description: string }) {
  return <div className="flex flex-wrap items-center gap-4 bg-soft-cloud p-6">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-(--radius-sm) bg-canvas"><Icon name="lock" size={18} /></div>
    <div className="min-w-0 flex-1 basis-[220px]"><h3 className="font-medium">{title}</h3><p className="mt-1 text-sm font-medium text-mute">{description}</p></div>
    <Button href="/api/checkout" size="sm">Pro로 업그레이드</Button>
  </div>;
}
