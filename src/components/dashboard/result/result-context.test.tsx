import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ResultContext, useResultContext } from "./result-context";

it("표시 모드와 선택된 카테고리를 패널 사이에 공유한다", () => {
  function ReadContext() {
    const { mode, category } = useResultContext();
    return <span>{mode} · {category}</span>;
  }
  render(<ResultContext.Provider value={{ mode: "sample", category: "cafe", setCategory: vi.fn() }}><ReadContext /></ResultContext.Provider>);
  expect(screen.getByText("sample · cafe")).toBeVisible();
});
