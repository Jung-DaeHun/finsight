import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { VerifySent } from "./VerifySent";

const mocks = vi.hoisted(() => ({ resend: vi.fn() }));
vi.mock("@/lib/supabase/browser", () => ({ createClient: () => ({ auth: mocks }) }));
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://finsight.example"); });

it("받는 주소를 굵게 보여주고 조사 없이 자연스럽게 안내하며, 스팸함 확인을 재발송 버튼 가까이 둔다", () => {
  render(<VerifySent email="member@example.com" />);
  const address = screen.getByText("member@example.com", { selector: "b" });
  expect(address.closest("p")).toHaveTextContent("member@example.com 메일함으로 인증 링크를 보냈습니다.");
  expect(address.closest("p")).not.toHaveTextContent("member@example.com로");
  const spam = screen.getByText("메일이 오지 않으면 스팸함을 확인해 주세요.");
  expect(spam).toBeVisible();
  expect(spam.nextElementSibling).toBe(screen.getByRole("button", { name: "인증 메일 다시 보내기" }));
});

it("인증 메일 재발송 실패 시 발송 화면을 유지하고 재시도를 허용한다", async () => {
  mocks.resend.mockResolvedValue({ error: { code: "over_email_send_rate_limit" } });
  render(<VerifySent email="member@example.com" />);
  fireEvent.click(screen.getByRole("button", { name: "인증 메일 다시 보내기" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.");
  expect(screen.getByRole("heading", { name: "메일함을 확인해 주세요" })).toBeVisible();
  expect(screen.getByRole("button", { name: "인증 메일 다시 보내기" })).toBeEnabled();
});
