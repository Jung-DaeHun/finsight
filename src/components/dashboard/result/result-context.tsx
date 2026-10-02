"use client";

import { createContext, useContext } from "react";
import type { Category } from "@/types";

export const CATEGORY_LABELS: Record<Category, string> = {
  food: "식비", cafe: "카페·간식", groceries: "생활·마트", transport: "교통",
  shopping: "쇼핑", subscription: "구독·디지털", utilities: "통신·공과금",
  housing: "주거", health: "의료", education: "교육", entertainment: "문화·여가",
  travel: "여행", transfer: "이체", income: "수입", other: "기타",
};

export const ResultContext = createContext<{
  mode: "user" | "sample";
  category: Category | null;
  setCategory: (category: Category | null) => void;
}>({ mode: "user", category: null, setCategory: () => {} });

export function useResultContext() {
  return useContext(ResultContext);
}
