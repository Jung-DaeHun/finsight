"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Toast } from "@/components/ui/Toast";
import type { Plan } from "@/types";

export function CheckoutStatus({ plan }: { plan: Plan }) {
  const router = useRouter();
  const refreshCount = useRef(0);
  const [late, setLate] = useState(false);
  useEffect(() => {
    if (plan === "pro" || refreshCount.current >= 20) return;
    const timer = window.setInterval(() => {
      refreshCount.current += 1;
      router.refresh();
      if (refreshCount.current >= 20) {
        window.clearInterval(timer);
        setLate(true);
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [plan, router]);

  if (plan === "pro") return <Toast message="Pro가 활성화됐습니다" />;
  return <div className="mb-6 flex flex-wrap items-center gap-4 bg-soft-cloud px-6 py-5" role="status">
    {!late && <Spinner label="결제 상태 확인" />}
    <div className="min-w-0 flex-1">
      <div className="text-base font-medium">결제 확인 중</div>
      <div className="text-sm font-medium text-mute">{late ? "확인이 늦어지고 있습니다. 잠시 후 새로고침해 주세요." : "Polar에서 결제 완료 알림을 받는 중입니다. 확인되면 자동으로 새로고침됩니다."}</div>
    </div>
    {late && <Button size="sm" variant="on-image" onClick={() => router.refresh()}>새로고침</Button>}
  </div>;
}
