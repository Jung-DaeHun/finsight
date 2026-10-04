import { render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { HowItWorks } from "./HowItWorks";

it("업로드부터 결과 확인까지 순서대로 3단계를 제공한다", () => {
  render(<HowItWorks />);
  const steps = within(screen.getByRole("list")).getAllByRole("listitem");
  expect(steps).toHaveLength(3);
  expect(steps[0]).toHaveTextContent("1파일 올리기");
  expect(steps[1]).toHaveTextContent("2분석 기다리기");
  expect(steps[2]).toHaveTextContent("3결과 확인");
});

it("예상 시간은 분석 중 화면과 같은 기대치(파일 3개 기준 최대 4분)를 말한다", () => {
  render(<HowItWorks />);
  expect(screen.getByText(/보통 1분 안에 끝나고, 파일 3개는 최대 4분까지 걸릴 수 있습니다/)).toBeVisible();
});
