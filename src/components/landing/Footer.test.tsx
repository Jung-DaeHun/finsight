import { render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { Footer } from "./Footer";

it("서비스 안내 링크와 문의 메일 링크를 제공한다", () => {
  render(<Footer />);
  const footer = within(screen.getByRole("contentinfo"));
  expect(footer.getByRole("link", { name: "이용약관" })).toHaveAttribute("href", "/terms");
  expect(footer.getByRole("link", { name: "개인정보처리방침" })).toHaveAttribute("href", "/privacy");
  expect(footer.getByRole("link", { name: "문의" }).getAttribute("href")).toMatch(/^mailto:[^\s@]+@[^\s@]+$/);
});
