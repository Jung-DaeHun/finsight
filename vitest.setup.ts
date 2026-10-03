import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// jsdom에는 matchMedia가 없다. 기본은 어떤 미디어 쿼리도 맞지 않는 것으로 둔다(애니메이션 없이 최종 상태).
// `@vitest-environment node` 파일에는 window가 없으므로 건너뛴다.
if (typeof window !== "undefined") window.matchMedia = vi.fn(() => ({ matches: false }) as MediaQueryList);

afterEach(cleanup);
