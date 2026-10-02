"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";
import { Toast } from "@/components/ui/Toast";
import type { Plan } from "@/types";

export function CheckoutStatus({ plan }: { plan: Plan }) {
  const router = useRouter();
  const refreshCount = useRef(0);
  useEffect(() => {
    if (plan === "pro" || refreshCount.current >= 20) return;
    const timer = window.setInterval(() => {
      refreshCount.current += 1;
      router.refresh();
      if (refreshCount.current >= 20) window.clearInterval(timer);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [plan, router]);

  if (plan === "pro") return <Toast message="Pro가 활성화됐습니다" />;
  return <div className="mb-6 flex items-center gap-4 bg-soft-cloud px-6 py-5" role="status">
    <Spinner label="결제 상태 확인" />
    <div>
      <div className="text-base font-medium">결제 확인 중</div>
      <div className="text-sm font-medium text-mute">Polar에서 결제 완료 알림을 받는 중입니다. 확인되면 자동으로 새로고침됩니다.</div>
    </div>
  </div>;
}
