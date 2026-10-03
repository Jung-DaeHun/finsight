"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
const STEPS = ["파일 읽는 중", "열 구조 파악 (날짜 · 금액 · 가맹점)", "거래 분류 중", "정기결제 · 이상거래 탐지", "요약 만드는 중"];

export function Analyzing({ filenames }: { filenames: string[] }) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    // 동기 요청의 안내 단계만 시간으로 바꾸고 마지막 단계에서 응답을 기다린다.
    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      setCurrent(step);
      if (step === STEPS.length - 1) clearInterval(timer);
    }, 5_000);
    return () => clearInterval(timer);
  }, []);
  return <div className="flex flex-col items-center gap-4 pt-24 text-center">
    <Spinner large label="명세서 분석 중" />
    <h2 className="text-2xl font-medium leading-tight">명세서를 분석하고 있습니다</h2>
    <p className="max-w-full break-all text-mute">{filenames.join(", ")}</p>
    <ol aria-label="분석 단계" className="my-2 flex flex-col gap-3 text-left">{STEPS.map((step, index) => <li key={step} aria-current={index === current ? "step" : undefined} className={`flex items-center gap-3 ${index < current ? "text-charcoal" : index === current ? "font-medium text-ink" : "text-mute"}`}>
      <span className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full ${index < current ? "border border-ink bg-ink text-on-primary" : index === current ? "border-2 border-ink" : "border border-hairline"}`}>{index < current && <Icon name="check" size={14} />}</span>{step}
    </li>)}</ol>
    <p className="text-sm font-medium text-mute">창을 닫지 마세요. 파일 3개 기준 최대 4분까지 걸릴 수 있습니다.</p>
  </div>;
}
