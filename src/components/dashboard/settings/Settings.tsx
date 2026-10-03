"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { PageTitle } from "@/components/ui/PageTitle";
import { SectionHead } from "@/components/ui/SectionHead";
import { formatKstDate } from "@/lib/format";
import { limits } from "@/lib/plan";
import type { AnalysisListItem, Plan } from "@/types";
import { AnalysisHistory } from "./AnalysisHistory";
import { WithdrawalModal } from "./WithdrawalModal";

export function Settings({ subscription, used, items, email }: {
  subscription: { plan: Plan; cancelAtPeriodEnd?: boolean; currentPeriodEnd?: string };
  used: number;
  items: AnalysisListItem[];
  email: string;
}) {
  const [withdrawal, setWithdrawal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const pro = subscription.plan === "pro";
  const end = subscription.currentPeriodEnd ? formatKstDate(subscription.currentPeriodEnd) : null;

  return <>
    <PageTitle title="설정" />
    <section aria-label="구독" className="mb-12">
      <SectionHead title="구독" />
      <div className="flex flex-wrap items-center gap-4">
        <p className="min-w-0 flex-1"><b>{pro ? "Pro" : "Free"}</b>{pro
          ? ` · $9/월${end ? subscription.cancelAtPeriodEnd ? ` · ${end}까지 Pro` : ` · 다음 결제일 ${end}` : ""}`
          : ` · 이번 달 분석 ${used}/${limits("free").monthlyAnalyses}회 사용`}</p>
        {pro ? <Button href="/api/portal" size="sm" variant="secondary">구독 관리<Icon name="external-link" size={16} /></Button>
          : <Button href="/api/checkout" size="sm">Pro로 업그레이드</Button>}
      </div>
    </section>
    <AnalysisHistory items={items} disabled={withdrawal} onPendingChange={setDeleting} />
    <section aria-label="계정" className="mb-12">
      <SectionHead title="계정" />
      <div className="flex flex-wrap items-center gap-4">
        <p className="min-w-0 flex-1 break-all">{email}</p>
        <button type="button" disabled={deleting} onClick={() => setWithdrawal(true)} className="text-sm font-medium text-sale disabled:text-stone">회원 탈퇴</button>
      </div>
    </section>
    {withdrawal && <WithdrawalModal onClose={() => setWithdrawal(false)} />}
  </>;
}
