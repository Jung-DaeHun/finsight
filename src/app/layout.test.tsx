import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import RootLayout, { metadata } from "./layout";

vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "font-inter" }),
  Noto_Sans_KR: () => ({ variable: "font-noto-sans-kr" }),
  Bebas_Neue: () => ({ variable: "font-bebas-neue" }),
}));
afterEach(() => vi.unstubAllEnvs());

it("한국어 문서에 폰트 변수와 페이지 내용을 렌더한다", () => {
  vi.stubEnv("MOCK_SERVICES", "");
  const html = renderToStaticMarkup(<RootLayout><main>본문</main></RootLayout>);
  expect(html).toContain('<html lang="ko">');
  expect(html).toContain('class="font-inter font-noto-sans-kr font-bebas-neue"');
  expect(html).toContain("<main>본문</main>");
  expect(html).not.toContain("데모 모드");
  expect(metadata.title).toContain("finsight");
});

it.each(["claude", "polar", "claude,polar"])("MOCK_SERVICES=%s이면 모든 화면 상단에 데모 모드 띠를 표시한다", (services) => {
  vi.stubEnv("MOCK_SERVICES", services);
  const html = renderToStaticMarkup(<RootLayout><main>본문</main></RootLayout>);
  expect(html.indexOf("데모 모드")).toBeGreaterThan(-1);
  expect(html.indexOf("데모 모드")).toBeLessThan(html.indexOf("<main>"));
});
