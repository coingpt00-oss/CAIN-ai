"use client";

type Coin = {
  id: string;
  symbol: string;
  name: string;
  image: string | null;
  market_cap_rank: number;
  current_price: number;
  price_change_percentage_1h_in_currency?: number | null;
  price_change_percentage_24h_in_currency?: number | null;
  price_change_percentage_7d_in_currency?: number | null;
  market_cap?: number | null;
  total_volume?: number | null;
};

const KRW = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});
const NUM = new Intl.NumberFormat("ko-KR");

function pct(v?: number | null) {
  if (v === null || v === undefined || Number.isNaN(v)) return "-";
  const s = `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
  return <span className={v >= 0 ? "text-emerald-400" : "text-rose-400"}>{s}</span>;
}

export default function MarketTableClient({
  items,
  updatedAt,
}: {
  items: Coin[];
  updatedAt?: string | null;
}) {
  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-2 text-[var(--brand)]">코인 시세</h1>
      <p className="text-sm opacity-70 mb-6">
        Updated: <span suppressHydrationWarning>{updatedAt ?? "-"}</span>
      </p>

      <div className="overflow-x-auto rounded-2xl ring-1 ring-white/10 bg-white/5">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">코인</th>
              <th className="px-4 py-3 text-right">가격(KRW)</th>
              <th className="px-4 py-3 text-right">1h</th>
              <th className="px-4 py-3 text-right">24h</th>
              <th className="px-4 py-3 text-right">7d</th>
              <th className="px-4 py-3 text-right">시총</th>
              <th className="px-4 py-3 text-right">거래량</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-t border-white/5 hover:bg-white/5">
                <td className="px-4 py-3">{c.market_cap_rank}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {c.image ? (
                      <img
                        src={c.image}
                        alt={c.name}
                        width={24}
                        height={24}
                        className="w-6 h-6 rounded-lg object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-lg bg-white/10" />
                    )}
                    <div className="min-w-0">
                      <div className="font-medium leading-tight">{c.name}</div>
                      <div className="text-xs opacity-60 uppercase">{c.symbol}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">{KRW.format(c.current_price ?? 0)}</td>
                <td className="px-4 py-3 text-right">{pct(c.price_change_percentage_1h_in_currency)}</td>
                <td className="px-4 py-3 text-right">{pct(c.price_change_percentage_24h_in_currency)}</td>
                <td className="px-4 py-3 text-right">{pct(c.price_change_percentage_7d_in_currency)}</td>
                <td className="px-4 py-3 text-right">
                  {c.market_cap ? KRW.format(c.market_cap) : "-"}
                </td>
                <td className="px-4 py-3 text-right">
                  {c.total_volume ? NUM.format(c.total_volume) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
