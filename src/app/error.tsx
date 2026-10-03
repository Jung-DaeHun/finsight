"use client";

import { Button } from "@/components/ui/Button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="mx-auto max-w-220 px-(--gutter) py-20 text-center">
    <h1 className="text-[32px] font-medium">문제가 발생했습니다</h1>
    <p className="mt-4 text-mute">잠시 후 다시 시도해 주세요.</p>
    <div className="mt-8"><Button onClick={reset}>다시 시도</Button></div>
  </main>;
}
