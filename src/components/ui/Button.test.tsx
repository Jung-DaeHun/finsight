import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { Button } from "./Button";

it("variant, 크기, 링크와 비활성 상태를 렌더한다", () => {
  render(<><Button variant="secondary" size="sm">보조</Button><Button disabled>중지</Button><Button href="/sample" variant="on-image">샘플</Button></>);
  expect(screen.getByRole("button", { name: "보조" })).toHaveClass("bg-soft-cloud", "h-9");
  expect(screen.getByRole("button", { name: "중지" })).toBeDisabled();
  expect(screen.getByRole("link", { name: "샘플" })).toHaveAttribute("href", "/sample");
});
