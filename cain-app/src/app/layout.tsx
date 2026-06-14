// src/app/layout.tsx
import type { ReactNode } from "react";
import "./globals.css";
import HeaderClient from "@/components/HeaderClient";
import Footer from "@/components/Footer";
import { MarketsProvider } from "./markets-provider";

export const metadata = {
  title: "CAIN — Coin AI Network",
  description: "에어드랍 · 뉴스 · 이벤트 · 차트, 한곳에서.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6729558233753700"
          crossOrigin="anonymous"
        />
      </head>

      <body className="min-h-dvh bg-black text-white">
        {/* ===== 전역 시세/글로벌 정보 Provider ===== */}
        <MarketsProvider>
          {/* ===== 헤더 ===== */}
          <HeaderClient />

          {/* ===== 메인 ===== */}
          <main className="mx-auto max-w-7xl px-6 py-10">
            {children}
          </main>

          {/* ===== 푸터 ===== */}
          <Footer />
        </MarketsProvider>
      </body>
    </html>
  );
}