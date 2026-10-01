import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { PageTitle } from "./PageTitle";

it("페이지 제목과 설명을 표시한다", () => {
  render(<PageTitle title="대시보드" description="이번 달 분석" />);
  expect(screen.getByRole("heading", { level: 1, name: "대시보드" })).toBeInTheDocument();
  expect(screen.getByText("이번 달 분석")).toBeInTheDocument();
});
