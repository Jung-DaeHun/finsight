import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { TransactionPanel } from "./TransactionPanel";
import { ResultContext } from "./result-context";

it("카테고리 필터와 검색을 함께 적용하고 공백·영문 대소문자를 처리한다", () => {
  render(<ResultContext.Provider value={{ mode: "user", category: "cafe", setCategory: vi.fn() }}>
    <TransactionPanel view={{ id: "filter", status: "completed", transactions: [
      { occurredOn: "2026-09-01", merchant: "Cafe A", amount: 5000, direction: "debit", category: "cafe" },
      { occurredOn: "2026-09-01", merchant: "Cafe A 식당", amount: 20000, direction: "debit", category: "food" },
    ] }} />
  </ResultContext.Provider>);
  fireEvent.change(screen.getByRole("searchbox", { name: "가맹점 검색" }), { target: { value: "  CAFE a  " } });
  expect(screen.getByText("1건 · ₩5,000")).toBeVisible();
  expect(screen.queryByText("Cafe A 식당")).not.toBeInTheDocument();
});
