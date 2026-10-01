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
  title: "finsight",
  description: "명세서를 올리면 지출이 정리됩니다.",
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
