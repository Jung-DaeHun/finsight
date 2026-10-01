import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { Field } from "./Field";

it("힌트와 오류를 입력에 연결한다", () => {
  render(<Field id="email" label="이메일" hint="이메일 주소" error="형식을 확인해 주세요" />);
  expect(screen.getByRole("textbox", { name: "이메일" })).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByRole("textbox", { name: "이메일" })).toHaveAttribute("aria-describedby", "email-hint email-error");
});
