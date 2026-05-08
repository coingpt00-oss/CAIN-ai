// src/app/markets/page.tsx
import { Suspense } from "react";
import MarketsClient from "./MarketsClient";

export const dynamic = "force-dynamic";

type SearchParams = {
  vs?: string;
  tab?: string;
};

type PageProps = {
  // Next 16: searchParams는 Promise 형태로 넘어옴
  searchParams: Promise<SearchParams>;
};

export default async function MarketsPage({ searchParams }: PageProps) {
  // ✅ 여기서 한 번만 await 해서 실제 값 꺼냄
  const sp = await searchParams;

  const vsParam = (sp?.vs ?? "krw").toLowerCase();
  const initialVs: "krw" | "usd" = vsParam === "usd" ? "usd" : "krw";

  const tabParam = sp?.tab;
  const initialTab: "value" | "trending" =
    tabParam === "trending" ? "trending" : "value";

  return (
    <Suspense
      fallback={
        <main className="w-full px-3 md:px-5 py-8">
          <div className="mx-auto w-full max-w-[1400px]">
            <p className="text-sm text-white/60">
              코인 시세를 불러오는 중입니다…
            </p>
          </div>
        </main>
      }
    >
      <MarketsClient initialVs={initialVs} initialTab={initialTab} />
    </Suspense>
  );
}
