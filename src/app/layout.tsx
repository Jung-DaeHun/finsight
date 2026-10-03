import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Bebas_Neue, Inter, Noto_Sans_KR } from "next/font/google";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { isMocked } from "@/lib/mock";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-inter" });
const notoSansKr = Noto_Sans_KR({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-noto-sans-kr" });
const bebasNeue = Bebas_Neue({ subsets: ["latin"], weight: "400", variable: "--font-bebas-neue" });

export const metadata: Metadata = {
  title: "finsight — 명세서를 올리면 지출이 정리됩니다",
  description: "카드 명세서·은행 거래내역(CSV·엑셀)을 올리면 지출을 분류하고 요약합니다. 정기결제·이상거래 탐지와 AI 절약 조언까지 finsight에서 확인하세요.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko">
      <body className={`${inter.variable} ${notoSansKr.variable} ${bebasNeue.variable}`}>
        <DemoBanner enabled={isMocked("claude") || isMocked("polar")} />
        {children}
      </body>
    </html>
  );
}
