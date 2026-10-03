import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ERROR_MESSAGES } from "@/messages/errors";
import { UploadForm } from "./UploadForm";

const mocks = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), fetch: vi.fn(), getFailedUploadFilename: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => mocks }));
vi.mock("@/app/dashboard/actions", () => ({ getFailedUploadFilename: mocks.getFailedUploadFilename }));
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.getFailedUploadFilename.mockResolvedValue("문제파일.xlsx");
});
afterEach(() => vi.unstubAllGlobals());
function file(name = "카드.csv", size = 12) { return new File([new Uint8Array(size)], name); }
function show(pro = false, used = 0) { return render(<UploadForm plan={pro ? "pro" : "free"} used={used} limit={pro ? 50 : 5} maxFiles={pro ? 3 : 1} />); }
function pick(files: File[]) { fireEvent.change(screen.getByLabelText("명세서 파일 선택"), { target: { files } }); }
function response(status: number, body: unknown) { return { status, json: async () => body }; }

it("파일 없을 때 시작을 막고 지원 형식·첫 시트·저장 고지·처리방침을 표시한다", () => {
  const { container } = show();
  expect(container.querySelector("#upload")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "분석 시작" })).toBeDisabled();
  expect(screen.getByText(/파일당 1MB, 시트 1,200행까지/)).toBeVisible();
  expect(screen.getByText(/첫 시트만 읽습니다/)).toBeVisible();
  expect(screen.getByText(/비공개 스토리지에 저장/)).toBeVisible();
  expect(screen.getByRole("link", { name: "개인정보 처리방침" })).toHaveAttribute("href", "/privacy");
});
it("Free가 동시에 2개를 선택하면 개수 오류·업그레이드 링크를 표시한다", () => {
  show(); pick([file(), file("은행.xlsx")]);
  expect(screen.getByRole("alert")).toHaveTextContent(ERROR_MESSAGES.too_many_files);
  expect(within(screen.getByRole("alert")).getByRole("link", { name: "Pro로 업그레이드" })).toHaveAttribute("href", "/api/checkout");
  expect(mocks.fetch).not.toHaveBeenCalled();
});
it("연속 선택으로도 Free 한도를 넘지 못한다", () => {
  show(); pick([file()]); pick([file("은행.xlsx")]);
  expect(screen.getByRole("alert")).toHaveTextContent(ERROR_MESSAGES.too_many_files);
  expect(screen.getByRole("list", { name: "선택한 파일" }).children).toHaveLength(1);
});
it("1MB 초과 파일에 크기 오류·파일명을 표시한다", () => {
  show(); pick([file("너무큰.xlsx", 1_048_577)]);
  expect(screen.getByRole("alert")).toHaveTextContent("너무큰.xlsx");
  expect(screen.getByRole("alert")).toHaveTextContent(ERROR_MESSAGES.file_too_large);
  expect(screen.getByRole("button", { name: "분석 시작" })).toBeDisabled();
});
it("1MB 경계·대문자 확장자는 허용하고 제거 후 다시 비활성화한다", () => {
  show(); pick([file("카드.CSV", 1_048_576)]);
  expect(screen.getByText(/1 MB/)).toBeVisible();
  expect(screen.getByRole("button", { name: "분석 시작" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "카드.CSV 제거" }));
  expect(screen.getByRole("button", { name: "분석 시작" })).toBeDisabled();
});
it("지원하지 않는 확장자는 안내하고 요청을 막는다", () => {
  show(); pick([file("명세서.pdf")]);
  expect(screen.getByRole("alert")).toHaveTextContent("CSV, xlsx, xls 파일만 올릴 수 있습니다.");
  expect(screen.getByRole("button", { name: "분석 시작" })).toBeDisabled();
});
it("Pro 다중 선택은 파일 수를 표시하고 4번째 파일은 거부한다", () => {
  show(true); pick([file(), file("은행.xlsx"), file("카드2.xls")]);
  expect(screen.getByRole("button", { name: "분석 시작 (3개 파일)" })).toBeEnabled();
  pick([file("추가.csv")]);
  expect(screen.getByRole("alert")).toHaveTextContent(ERROR_MESSAGES.too_many_files);
  expect(screen.queryByRole("link", { name: "Pro로 업그레이드" })).not.toBeInTheDocument();
});
it("드래그·드롭으로도 파일을 선택할 수 있다", () => {
  show();
  const zone = screen.getByRole("button", { name: "파일을 끌어다 놓거나 클릭해서 선택" });
  fireEvent.dragOver(zone);
  expect(zone).toHaveClass("border-ink");
  fireEvent.drop(zone, { dataTransfer: { files: [file("은행.xlsx")] } });
  expect(screen.getByText("은행.xlsx")).toBeVisible();
  expect(zone).toHaveClass("border-stone");
});
it.each([5, 6])("5.2: 사용량 %i회면 선택 후에도 한도 소진 문구로 비활성화한다", (used) => {
  show(false, used); pick([file()]);
  expect(screen.getByRole("button", { name: "이번 달 분석 횟수를 모두 사용했습니다" })).toBeDisabled();
  expect(screen.getByText(ERROR_MESSAGES.monthly_limit)).toBeVisible();
});
it("2.3: 제출 중 폼 대신 분석 화면을 표시하고 재클릭을 막는다", async () => {
  let finish!: (value: unknown) => void;
  mocks.fetch.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  show(); pick([file()]);
  const start = screen.getByRole("button", { name: "분석 시작" });
  fireEvent.click(start);
  expect(screen.getByRole("heading", { name: "명세서를 분석하고 있습니다" })).toBeVisible();
  expect(screen.getByRole("button", { name: "분석 시작" })).toBeDisabled();
  expect(screen.queryByLabelText("명세서 파일 선택")).not.toBeInTheDocument();
  fireEvent.click(start); fireEvent.click(screen.getByRole("button", { name: "분석 시작" }));
  expect(mocks.fetch).toHaveBeenCalledOnce();
  const [url, options] = mocks.fetch.mock.calls[0];
  expect(url).toBe("/api/analyses");
  expect(options.method).toBe("POST");
  expect(options.headers).toBeUndefined();
  expect(options.body.getAll("files").map((entry: File) => entry.name)).toEqual(["카드.csv"]);
  await act(async () => { finish(response(201, { analysisId: "created" })); });
  expect(mocks.push).toHaveBeenCalledWith("/dashboard/analyses/created");
});
it("2.4: JSON 없는 401도 로그인으로 이동한다", async () => {
  mocks.fetch.mockResolvedValue({ status: 401, json: vi.fn().mockRejectedValue(new Error("no json")) });
  show(); pick([file()]); fireEvent.click(screen.getByRole("button", { name: "분석 시작" }));
  await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/login"));
});
it("5.1: 422의 uploadId로 본인 실패 파일명을 확인해 오류를 표시한다", async () => {
  mocks.fetch.mockResolvedValue(response(422, { error: { code: "file_encrypted", analysisId: "analysis", uploadId: "server-upload" } }));
  show(true); pick([file(), file("문제파일.xlsx")]);
  fireEvent.click(screen.getByRole("button", { name: "분석 시작 (2개 파일)" }));
  const alert = await screen.findByRole("alert");
  expect(mocks.getFailedUploadFilename).toHaveBeenCalledWith("analysis", "server-upload");
  expect(alert).toHaveTextContent("문제파일.xlsx");
  expect(alert).toHaveTextContent(ERROR_MESSAGES.file_encrypted);
  expect(mocks.refresh).toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "분석 시작 (2개 파일)" })).toBeEnabled();
});
it.each(["duplicate_file", "monthly_limit", "analysis_in_progress", "timeout"] as const)("API %s는 중앙 문구를 표시하고 성공 이동을 하지 않는다", async (code) => {
  mocks.fetch.mockResolvedValue(response(code === "timeout" ? 504 : code === "monthly_limit" ? 429 : 409, { error: { code } }));
  show(); pick([file()]); fireEvent.click(screen.getByRole("button", { name: "분석 시작" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(ERROR_MESSAGES[code]);
  expect(mocks.push).not.toHaveBeenCalled();
});
it.each(["network", "html", "unknown", "invalid-success"])("확인할 수 없는 %s 응답은 재시도·새로고침 안내를 제공한다", async (kind) => {
  if (kind === "network") mocks.fetch.mockRejectedValue(new Error("private payload"));
  if (kind === "html") mocks.fetch.mockResolvedValue({ status: 504, json: async () => { throw new Error("<html>private</html>"); } });
  if (kind === "unknown") mocks.fetch.mockResolvedValue(response(500, { error: { code: "__proto__", message: "private" } }));
  if (kind === "invalid-success") mocks.fetch.mockResolvedValue(response(201, {}));
  show(); pick([file()]); fireEvent.click(screen.getByRole("button", { name: "분석 시작" }));
  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent(/다시 시도/);
  expect(alert).toHaveTextContent(/새로고침/);
  expect(alert).not.toHaveTextContent(/private/);
  fireEvent.click(screen.getByRole("button", { name: "대시보드 새로고침" }));
  expect(mocks.refresh).toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "분석 시작" })).toBeEnabled();
});
it("파일명 확인에 실패해도 원래 422 오류를 유지한다", async () => {
  mocks.fetch.mockResolvedValue(response(422, { error: { code: "too_many_rows", analysisId: "analysis", uploadId: "upload" } }));
  mocks.getFailedUploadFilename.mockRejectedValue(new Error("private"));
  show(); pick([file()]); fireEvent.click(screen.getByRole("button", { name: "분석 시작" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(ERROR_MESSAGES.too_many_rows);
});
it("B1: 드롭존 바로 아래 접힌 안내로 명세서 파일 받는 순서를 알려 준다", () => {
  show();
  const details = screen.getByText("명세서 파일은 어디서 받나요?").closest("details")!;
  expect(details).not.toHaveAttribute("open");
  expect(Array.from(details.querySelectorAll("li"), (item) => item.textContent)).toEqual([
    "카드사·은행 앱이나 홈페이지에 로그인합니다.",
    "이용내역(거래내역) 조회 메뉴를 엽니다.",
    "분석할 기간을 선택합니다.",
    "엑셀 또는 CSV 파일로 저장합니다.",
  ]);
  const zone = screen.getByRole("button", { name: "파일을 끌어다 놓거나 클릭해서 선택" });
  const siblings = Array.from(zone.parentElement!.children);
  // 드롭존 다음은 숨겨진 file input, 그다음이 안내다.
  expect(siblings.indexOf(details)).toBe(siblings.indexOf(zone) + 2);
});
it("B7: 한도에 도달한 Free에게 비활성 버튼 옆에 업그레이드 경로를 함께 보여 준다", () => {
  show(false, 5);
  expect(screen.getByRole("button", { name: "이번 달 분석 횟수를 모두 사용했습니다" })).toBeDisabled();
  expect(screen.getByText(ERROR_MESSAGES.monthly_limit)).toBeVisible();
  expect(screen.getByText("Pro는 매월 50회까지 분석할 수 있습니다.")).toBeVisible();
  expect(screen.getByRole("link", { name: "Pro로 업그레이드" })).toHaveAttribute("href", "/api/checkout");
});
it("B7: 한도에 도달한 Pro에게는 초기화 안내만 보여 준다", () => {
  show(true, 50);
  expect(screen.getByText(ERROR_MESSAGES.monthly_limit)).toBeVisible();
  expect(screen.queryByText(/Pro는 매월/)).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Pro로 업그레이드" })).not.toBeInTheDocument();
});
it("B7: 한도 전에는 업그레이드 경로를 보이지 않는다", () => {
  show(false, 4);
  expect(screen.queryByRole("link", { name: "Pro로 업그레이드" })).not.toBeInTheDocument();
});
