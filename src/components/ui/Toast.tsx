"use client";

import { useEffect, useState } from "react";

export function Toast({ message, onClose }: { message: string; onClose?: () => void }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => { setVisible(false); onClose?.(); }, 2600);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);
  if (!visible) return null;
  return <div role="status" className="fixed bottom-7 left-1/2 z-60 -translate-x-1/2 rounded-pill bg-ink px-6 py-3 text-sm font-medium text-on-primary">{message}</div>;
}
