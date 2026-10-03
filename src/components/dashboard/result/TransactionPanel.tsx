"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { SectionHead } from "@/components/ui/SectionHead";
import { formatShortDate, formatWon } from "@/lib/format";
import type { AnalysisView, TransactionView } from "@/types";
import { CATEGORY_LABELS, useResultContext } from "./result-context";

// 일반 거래 DTO에는 플래그가 없으므로 Pro 탐지 목록의 거래 키와 대조한다.
function transactionKey(tx: TransactionView) {
  return JSON.stringify([tx.occurredOn, tx.merchant, tx.amount, tx.direction]);
}

export function TransactionPanel({ view }: { view: AnalysisView }) {
  const { category } = useResultContext();
  const [query, setQuery] = useState("");
  const [all, setAll] = useState(false);
  const inputId = useId();
  const search = query.trim().toLocaleLowerCase("ko-KR");
  const rows = (view.transactions ?? []).filter((tx) => (!category || tx.category === category) && (!search || tx.merchant.toLocaleLowerCase("ko-KR").includes(search)))
    .sort((a, b) => a.occurredOn < b.occurredOn ? 1 : a.occurredOn > b.occurredOn ? -1 : 0);
  const shown = all ? rows : rows.slice(0, 10);
  const sum = rows.reduce((total, tx) => total + (tx.direction === "credit" ? -tx.amount : tx.amount), 0);
  const duplicates = new Set((view.detections?.items ?? []).filter((tx) => tx.anomalyType === "duplicate").map(transactionKey));
  return <section aria-label="거래 내역" className="!col-span-full">
    <SectionHead title={category ? `거래 내역 · ${CATEGORY_LABELS[category]}` : "거래 내역"} />
    <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
      <div className="w-full max-w-[260px]">
        <Field id={inputId} label="가맹점 검색" type="search" placeholder="가맹점 검색" value={query} onChange={(event) => setQuery(event.target.value)} className="!h-9 !text-sm" />
      </div>
      <p className="text-sm font-medium text-mute" aria-live="polite">{rows.length}건 · {formatWon(sum)}</p>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full table-fixed border-collapse text-sm font-medium">
        <thead><tr className="border-b border-ink text-left text-mute">
          <th scope="col" className="w-18 py-2.5 pr-3 font-medium">날짜</th>
          <th scope="col" className="py-2.5 pr-3 font-medium">가맹점</th>
          <th scope="col" className="w-32 py-2.5 pr-3 font-medium max-[860px]:hidden">카테고리</th>
          <th scope="col" className="w-28 py-2.5 text-right font-medium max-[600px]:w-24">금액</th>
        </tr></thead>
        <tbody>{shown.map((tx, i) => <tr key={i} className="border-b border-hairline-soft align-top">
          <td className="py-2.5 pr-3 text-mute">{formatShortDate(tx.occurredOn)}</td>
          <td className="py-2.5 pr-3 break-words">{tx.merchant}{duplicates.has(transactionKey(tx)) && <span className="ml-2 text-xs text-sale">중복 의심</span>}
            {tx.description && <p className="text-xs text-mute">{tx.description}</p>}
          </td>
          <td className="py-2.5 pr-3 max-[860px]:hidden">{CATEGORY_LABELS[tx.category]}</td>
          <td className="py-2.5 text-right tabular-nums break-words">{tx.direction === "credit" ? "-" : ""}{formatWon(tx.amount)}</td>
        </tr>)}</tbody>
      </table>
      {rows.length === 0 && <p className="py-6 text-center text-sm text-mute">조건에 맞는 거래가 없습니다.</p>}
    </div>
    {rows.length > 10 && <div className="mt-3"><Button size="sm" variant="secondary" onClick={() => setAll(!all)}>{all ? "접기" : `전체 보기 (${rows.length})`}</Button></div>}
  </section>;
}
