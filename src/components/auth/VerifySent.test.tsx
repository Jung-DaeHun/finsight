import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { VerifySent } from "./VerifySent";

const mocks = vi.hoisted(() => ({ resend: vi.fn() }));
vi.mock("@/lib/supabase/browser", () => ({ createClient: () => ({ auth: mocks }) }));
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://finsight.example"); });

it("인증 메일 재발송 실패 시 발송 화면을 유지하고 재시도를 허용한다", async () => {
  mocks.resend.mockResolvedValue({ error: { code: "over_email_send_rate_limit" } });
  render(<VerifySent email="member@example.com" />);
  fireEvent.click(screen.getByRole("button", { name: "인증 메일 다시 보내기" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.");
  expect(screen.getByRole("heading", { name: "메일함을 확인해 주세요" })).toBeVisible();
  expect(screen.getByRole("button", { name: "인증 메일 다시 보내기" })).toBeEnabled();
});
