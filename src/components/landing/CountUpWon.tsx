"use client";

import { useEffect, useState } from "react";
import { formatWon } from "@/lib/format";

const DURATION = 1500;

/** 서버 HTML과 움직임 줄이기 설정에서는 최종 금액을 그대로 보여주고, 그 밖에는 마운트 후 ₩0부터 올린다. */
export function CountUpWon({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
    let start: number | undefined;
    let frame = 0;
    const tick = (now: number) => {
      start ??= now;
      const t = Math.min((now - start) / DURATION, 1);
      setShown(Math.round(value * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return formatWon(shown);
}
