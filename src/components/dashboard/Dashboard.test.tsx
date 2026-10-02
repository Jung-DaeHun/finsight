import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { Dashboard } from "./Dashboard";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/app/dashboard/actions", () => ({ getFailedUploadFilename: vi.fn() }));
it("빈 목록에서도 삭제와 독립적인 사용량을 표시하고 미터를 한도까지 채운다", () => {
  render(<Dashboard plan="free" used={6} limit={5} maxFiles={1} items={[]} />);
  expect(screen.getByText("6 / 5회")).toBeVisible();
  expect(screen.getByRole("progressbar", { name: "이번 달 분석 사용량" })).toHaveAttribute("value", "5");
  expect(screen.getByText("첫 명세서를 올려 보세요")).toBeVisible();
  expect(screen.getByRole("button", { name: "이번 달 분석 횟수를 모두 사용했습니다" })).toBeDisabled();
});
it("Free는 기록 아래에 다중 파일 잠금 카드를 표시한다", () => {
  render(<Dashboard plan="free" used={1} limit={5} maxFiles={1} items={[{ id: "analysis", status: "completed", createdAt: "2026-10-01", filenames: ["카드.csv"], periodTo: "2026-09-30", totalSpend: 12000 }]} />);
  expect(screen.getByText("카드·계좌 여러 개를 한 번에")).toBeVisible();
  expect(screen.queryByText("첫 명세서를 올려 보세요")).not.toBeInTheDocument();
});
