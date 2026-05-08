// src/app/markets/MarketsClient.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import StarButton from "@/components/StarButton";
import PremiumBanner from "@/components/PremiumBanner";
import { getMarketsCache, type MarketsCache } from "@/lib/clientCache";

// ✅ page.tsx 에서 넘겨주는 초기값 타입
type MarketsClientProps = {
  initialVs: "krw" | "usd";
  initialTab: "value" | "trending";
};

type Item = {
  id: string;
  image: string;
  name: string;
  symbol: string;
  market_cap_rank?: number;
  current_price?: number;
  price_change_percentage_1h_in_currency?: number | null;
  price_change_percentage_24h?: number | null;
  price_change_percentage_7d_in_currency?: number | null;
  market_cap?: number;
  total_volume?: number;
};

function formatFiat(n: number | undefined, vs: string) {
  if (n == null || Number.isNaN(n)) return "-";
  const code = (vs || "krw").toUpperCase();
  try {
    return n.toLocaleString(code === "KRW" ? "ko-KR" : "en-US", {
      style: "currency",
      currency: code === "KRW" ? "KRW" : code,
      maximumFractionDigits: code === "KRW" ? 0 : 2,
    });
  } catch {
    return String(n);
  }
}

function Pct({ v }: { v: number | null | undefined }) {
  if (v == null || Number.isNaN(v)) return <span>-</span>;
  const sign = v > 0 ? "+" : "";
  const cls = v >= 0 ? "text-emerald-400" : "text-rose-400";
  return <span className={cls}>{`${sign}${v.toFixed(2)}%`}</span>;
}

// ⬇️ 이름도 MarketsClient, props 도 받도록 변경
export default function MarketsClient({ initialVs, initialTab }: MarketsClientProps) {
  const sp = useSearchParams();
  const router = useRouter();

  // URL 쿼리가 있으면 그걸 우선, 없으면 서버에서 넘긴 initial 값 사용
  const vsParam = sp.get("vs");
  const tabParam = sp.get("tab");

  const vs: "krw" | "usd" =
    vsParam && vsParam.toLowerCase() === "usd"
      ? "usd"
      : vsParam && vsParam.toLowerCase() === "krw"
      ? "krw"
      : initialVs;

  const tab: "value" | "trending" =
    tabParam === "trending"
      ? "trending"
      : tabParam === "value"
      ? "value"
      : initialTab;

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [global, setGlobal] = useState<MarketsCache["global"]>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      try {
        const cache = await getMarketsCache(vs === "usd" ? "usd" : "krw");
        if (!alive || !cache) return;
        setItems(cache.items as Item[]);
        setGlobal(cache.global);
        setUpdatedAt(cache.updatedAt);
      } finally {
        if (alive) setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [vs, tab]);

  const linkWith = (next: Partial<{ tab: string; vs: string }>) => {
    const u = new URL(window.location.href);
    if (next.tab) u.searchParams.set("tab", next.tab);
    if (next.vs) u.searchParams.set("vs", next.vs);
    router.push(u.pathname + "?" + u.searchParams.toString());
  };

  return (
    <main className="w-full px-3 md:px-5 py-8">
      <div className="mx-auto w-full max-w-[1400px]">
        <PremiumBanner />

        <h1 className="text-2xl font-semibold mb-6 text-[var(--brand)]">
          코인 시세
        </h1>

        {global && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="opacity-60 text-sm mb-1">시가총액</div>
              <div className="text-xl font-bold">
                {formatFiat(global.total_market_cap, vs)}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="opacity-60 text-sm mb-1">24h 거래량</div>
              <div className="text-xl font-bold">
                {formatFiat(global.total_volume_24h, vs)}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="opacity-60 text-sm mb-1">BTC 도미넌스</div>
              <div className="text-xl font-bold">
                {global.btc_dominance != null
                  ? `${global.btc_dominance.toFixed(2)}%`
                  : "-"}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 mb-3">
          <div className="inline-flex rounded-full bg-white/5 p-1">
            <button
              className={`px-3 py-1 rounded-full ${
                tab === "value" ? "bg-white/10" : ""
              }`}
              onClick={() => linkWith({ tab: "value" })}
            >
              가치
            </button>
            <button
              className={`px-3 py-1 rounded-full ${
                tab === "trending" ? "bg-white/10" : ""
              }`}
              onClick={() => linkWith({ tab: "trending" })}
            >
              인기
            </button>
          </div>

          <div className="ml-2 inline-flex rounded-full bg-white/5 p-1">
            <button
              className={`px-3 py-1 rounded-full ${
                vs === "krw" ? "bg-white/10" : ""
              }`}
              onClick={() => linkWith({ vs: "krw" })}
            >
              KRW
            </button>
            <button
              className={`px-3 py-1 rounded-full ${
                vs === "usd" ? "bg-white/10" : ""
              }`}
              onClick={() => linkWith({ vs: "usd" })}
            >
              USD
            </button>
          </div>

          <div className="text-sm opacity-60 ml-auto">
            Updated: <span>{updatedAt ?? "-"}</span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl ring-1 ring-white/10">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5 text-xs uppercase">
              <tr>
                <th className="px-3 py-3 text-left w-10">⭐</th>
                <th className="px-3 py-3 text-left w-10">#</th>
                <th className="px-3 py-3 text-left">코인</th>
                <th className="px-3 py-3 text-center">
                  가격({vs.toUpperCase()})
                </th>
                <th className="px-3 py-3 text-center">1H</th>
                <th className="px-3 py-3 text-center">24H</th>
                <th className="px-3 py-3 text-center">7D</th>
                <th className="px-3 py-3 text-center">시가총액</th>
                <th className="px-3 py-3 text-center">거래량</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-3 py-6 text-center text-white/60"
                  >
                    불러오는 중…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-3 py-6 text-center text-white/60"
                  >
                    데이터 없음
                  </td>
                </tr>
              ) : (
                items.map((c, idx) => (
                  <tr
                    key={`${c.id}-${c.market_cap_rank ?? idx}`}
                    className="border-t border-white/5 hover:bg-white/5"
                  >
                    <td className="px-3 py-3">
                      <StarButton id={c.id} />
                    </td>
                    <td className="px-3 py-3">{c.market_cap_rank ?? "-"}</td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/coin/${c.id}`}
                        className="flex items-center gap-3"
                      >
                        <img
                          src={c.image}
                          alt={c.name}
                          width={24}
                          height={24}
                          className="w-6 h-6 rounded-lg object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                        <div className="min-w-0">
                          <div className="font-medium leading-tight">
                            {c.name}
                          </div>
                          <div className="text-xs opacity-60 uppercase">
                            {c.symbol}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {formatFiat(c.current_price, vs)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Pct v={c.price_change_percentage_1h_in_currency} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Pct v={c.price_change_percentage_24h} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Pct v={c.price_change_percentage_7d_in_currency} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      {formatFiat(c.market_cap, vs)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {formatFiat(c.total_volume, vs)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
