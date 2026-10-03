import { render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { ERROR_MESSAGES } from "@/messages/errors";
import { AnalysisList } from "./AnalysisList";

it("완료·실패는 상세 링크, 처리 중은 비활성 행으로 상태·금액·파일명을 표시한다", () => {
  render(<AnalysisList items={[
    { id: "completed", status: "completed", createdAt: "2026-10-01T23:00:00Z", filenames: ["카드.csv", "은행.xlsx"], periodTo: "2026-09-30", totalSpend: 12000 },
    { id: "failed", status: "failed", createdAt: "2026-10-02T00:00:00Z", filenames: ["실패.xls"], errorCode: "file_encrypted" },
    { id: "processing", status: "processing", createdAt: "2026-10-02T01:00:00Z", filenames: ["진행.csv"] },
  ]} />);
  expect(screen.getByRole("heading", { name: /내 분석\s*\(3\)/ })).toBeVisible();
  expect(screen.getByRole("link", { name: /2026년 9월/ })).toHaveAttribute("href", "/dashboard/analyses/completed");
  expect(screen.getByText("카드.csv · 은행.xlsx")).toBeVisible();
  // 생성 시각(UTC 23시)은 한국 날짜(다음 날)로 표시한다.
  expect(within(screen.getByRole("link", { name: /2026년 9월/ })).getByText("2026.10.02")).toBeVisible();
  expect(screen.getByText("₩12,000")).toBeVisible();
  expect(screen.getByRole("link", { name: /분석 실패/ })).toHaveAttribute("href", "/dashboard/analyses/failed");
  expect(screen.getByText(ERROR_MESSAGES.file_encrypted)).toBeVisible();
  expect(screen.getByRole("button", { name: /분석 중/ })).toBeDisabled();
});
it("파일명을 HTML로 해석하지 않는다", () => {
  const { container } = render(<AnalysisList items={[{ id: "failed", status: "failed", createdAt: "2026-10-02T00:00:00Z", filenames: ["<img src=x onerror=alert(1)>.csv"] }]} />);
  expect(screen.getByText("<img src=x onerror=alert(1)>.csv")).toBeVisible();
  expect(container.querySelector("img")).toBeNull();
});
