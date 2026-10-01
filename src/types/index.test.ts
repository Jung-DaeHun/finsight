import { expect, expectTypeOf, it } from "vitest";
import { CATEGORIES } from "@/types";
import type { Category, RawTx, Transaction, TransactionView } from "@/types";

it("거래 카테고리는 ARCHITECTURE 5.3의 15개 값으로 제한한다", () => {
  expect(CATEGORIES).toEqual([
    "food", "cafe", "groceries", "transport", "shopping", "subscription", "utilities",
    "housing", "health", "education", "entertainment", "travel", "transfer", "income", "other",
  ]);
  expectTypeOf<Category>().toEqualTypeOf<(typeof CATEGORIES)[number]>();
});

it("일반 거래와 정규화 결과 타입에서 파생 전용 필드를 제외한다", () => {
  expectTypeOf<TransactionView>().toEqualTypeOf<Omit<Transaction, "isRecurring" | "anomalyType">>();
  expectTypeOf<RawTx>().toEqualTypeOf<Omit<Transaction, "category" | "isRecurring" | "anomalyType">>();
});
