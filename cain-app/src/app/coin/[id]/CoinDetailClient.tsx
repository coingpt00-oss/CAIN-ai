// src/app/coin/[id]/CoinDetailClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import TradingViewChart from "./TradingViewChart";
import { getMarketsCache, type MarketsCache } from "@/lib/clientCache";
import PremiumBanner from "@/components/PremiumBanner";
import AiBox from "@/components/ai/AiBox";

type DetailPayload = {
  ok: boolean;
  id: string;
  symbol: string;
  name: string;
  image?: any;
  vs: string;
  updatedAt?: string;
  market?: {
    current_price: number | null;
    market_cap: number | null;
    total_volume: number | null;
    price_change_percentage_1h_in_currency: number | null;
    price_change_percentage_24h_in_currency: number | null;
    price_change_percentage_7d_in_currency: number | null;
  };
  fallback?: boolean;
};

type TickerItem = {
  base: string;
  target: string;
  market?: string;
  market_logo?: string | null;
  trust_score?: string | null;
  last?: number | null;
  volume?: number | null;
  bid_ask_spread_percentage?: number | null;
  trade_url?: string | null;
  updated_at?: string | null;
  pair_label?: string | null;
};

type Props = {
  coinId: string;
  vs: string;
  binanceSymbol: string | null; // 지금은 안 쓰지만 타입 유지
  initialSummary: any;
  initialSummaryError: string | null;
  initialDetail: DetailPayload | null;
  initialFallback?: boolean;
  initialError: string | null;
  initialTickers: TickerItem[];
  initialTickersError: string | null;
};

// ─────────────────────────── helpers ───────────────────────────
function formatFiat(n: number | null | undefined, vs: string) {
  if (n == null || Number.isNaN(n)) return "-";
  const code = (vs || "usd").toUpperCase();
  try {
    const isKrw = code === "KRW";
    return n.toLocaleString(isKrw ? "ko-KR" : "en-US", {
      style: "currency",
      currency: isKrw ? "KRW" : code,
      maximumFractionDigits: isKrw ? 0 : 2,
    });
  } catch {
    return String(n);
  }
}

function formatPct(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "-";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function pctClass(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "text-white/60";
  return n >= 0 ? "text-emerald-400" : "text-rose-400";
}

function trustDotClass(score?: string | null) {
  if (!score) return "bg-white/30";
  const s = score.toLowerCase();
  if (s.includes("green") || s.includes("high")) return "bg-emerald-400";
  if (s.includes("yellow") || s.includes("medium")) return "bg-yellow-400";
  if (s.includes("red") || s.includes("low")) return "bg-rose-400";
  return "bg-white/30";
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─────────────────────────── component ───────────────────────────
export default function CoinDetailClient({
  coinId,
  vs,
  binanceSymbol, // 사용은 안 하지만 타입 유지
  initialDetail,
  initialError,
  initialTickers,
}: Props) {
  // 시세 요약(1h/24h/7d)은 브라우저 캐시로 보충
  const [summary, setSummary] = useState<any | null>(null);

  // ✅ tickers: SSR 초기값(보통 빈 배열) + 클라 fetch로 갱신
  const [tickers, setTickers] = useState<TickerItem[]>(initialTickers || []);
  const [tickersLoading, setTickersLoading] = useState<boolean>(
    (initialTickers || []).length === 0
  );
  const [tickersErr, setTickersErr] = useState<string | null>(null);

  // ✅ “실패 시 tickers를 비우지 않는다”를 위한 ref(마지막 정상값 유지)
  const lastGoodTickersRef = useRef<TickerItem[]>(
    (initialTickers || []).length ? initialTickers : []
  );

  // ── summary 보충 ─────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const cache: MarketsCache | null = await getMarketsCache(
          vs === "krw" ? "krw" : "usd"
        );
        if (!alive || !cache) return;
        const found = (cache.items || []).find((c: any) => c.id === coinId);
        setSummary(found || null);
      } catch {
        // 무시
      }
    })();
    return () => {
      alive = false;
    };
  }, [coinId, vs]);

  // ── ✅ tickers 클라 1회 fetch (안정화 강화) ─────────────────────────────
  useEffect(() => {
    // ✅ tickers는 vs와 무관(USD로 내려오는 구조) → 불필요 재호출 방지
    const ac = new AbortController();
    const TIMEOUT_MS = 8000;

    let timeoutId: any = null;
    const withTimeout = () => {
      timeoutId = setTimeout(() => ac.abort(), TIMEOUT_MS);
    };

    const run = async (attempt: number) => {
      try {
        setTickersLoading(true);
        setTickersErr(null);

        const qs = new URLSearchParams({
          id: coinId,
          limit: "50",
        }).toString();

        withTimeout();
        const r = await fetch(`/api/public/coin/tickers?${qs}`, {
          method: "GET",
          signal: ac.signal,
          // 여기서 "no-store"를 줘도, 실제 캐싱은 Next API route가 cache-control로 담당
          cache: "no-store",
        });

        clearTimeout(timeoutId);

        const j = await r.json().catch(() => null);

        // ✅ 실패 시 “비우지 말고” 마지막 정상값 유지 (화면 덜 터짐)
        if (!r.ok || !j?.ok || !Array.isArray(j.items)) {
          const err = j?.error || `tickers_failed_${r.status}`;
          setTickersErr(err);

          // 재시도 1회 (네트워크 순간 흔들림 대비)
          if (attempt === 0 && !ac.signal.aborted) {
            await sleep(250);
            return run(1);
          }
          // 최종 실패: lastGood 유지
          setTickers(lastGoodTickersRef.current || []);
          return;
        }

        const items = j.items as TickerItem[];
        setTickers(items);
        lastGoodTickersRef.current = items;
        setTickersErr(null);
      } catch (e: any) {
        clearTimeout(timeoutId);

        if (e?.name === "AbortError") {
          // timeout or route change
          // abort 시에도 기존 tickers 유지
          setTickersErr("tickers_timeout_or_aborted");
          setTickers(lastGoodTickersRef.current || []);
          return;
        }

        setTickersErr("tickers_fetch_failed");

        // 재시도 1회
        if (attempt === 0 && !ac.signal.aborted) {
          await sleep(250);
          return run(1);
        }

        // 최종 실패: lastGood 유지
        setTickers(lastGoodTickersRef.current || []);
      } finally {
        setTickersLoading(false);
      }
    };

    run(0);

    return () => {
      clearTimeout(timeoutId);
      ac.abort();
    };
  }, [coinId]);

  const detail = initialDetail || null;
  const market = detail?.market;

  // 이미지 URL 안전 처리
  const imageUrl: string =
    typeof (detail as any)?.image === "string"
      ? (detail as any).image
      : (detail as any)?.image?.large ||
        (detail as any)?.image?.small ||
        "";

  const name = detail?.name || coinId;
  const symbol = detail?.symbol?.toUpperCase?.() || "";

  const price = market?.current_price ?? summary?.current_price ?? null;
  const mc = market?.market_cap ?? summary?.market_cap ?? null;
  const vol = market?.total_volume ?? summary?.total_volume ?? null;

  const p1h =
    market?.price_change_percentage_1h_in_currency ??
    summary?.price_change_percentage_1h_in_currency ??
    null;
  const p24h =
    market?.price_change_percentage_24h_in_currency ??
    summary?.price_change_percentage_24h ??
    null;
  const p7d =
    market?.price_change_percentage_7d_in_currency ??
    summary?.price_change_percentage_7d_in_currency ??
    null;

  // ✅ 코인 상세 AI 컨텍스트 (tickers 클라 fetch 반영)
  const aiContext = useMemo(() => {
    const topTickers = (tickers || []).slice(0, 12).map((t) => ({
      market: t.market || null,
      pair: t.pair_label ?? `${t.base}/${t.target}`,
      price_usd: t.last ?? null,
      volume_usd: t.volume ?? null,
      spread_pct: t.bid_ask_spread_percentage ?? null,
      trust: t.trust_score ?? null,
      trade_url: t.trade_url ?? null,
    }));

    return {
      page: "coin_detail",
      coin: {
        id: coinId,
        name,
        symbol,
        vs,
      },
      snapshot: {
        price,
        market_cap: mc,
        volume_24h: vol,
        change_1h: p1h,
        change_24h: p24h,
        change_7d: p7d,
      },
      source: {
        detail_fallback: (detail as any)?.fallback ?? null,
        detail_updated_at: (detail as any)?.updatedAt ?? null,
        tickers_error: tickersErr,
        tickers_loading: tickersLoading,
      },
      top_tickers: topTickers,
    };
  }, [
    tickers,
    tickersErr,
    tickersLoading,
    coinId,
    name,
    symbol,
    vs,
    price,
    mc,
    vol,
    p1h,
    p24h,
    p7d,
    detail,
  ]);

  const defaultPrompt = useMemo(() => {
    return `이 코인을 "판단 보조" 관점에서 정리해줘.
(1) 지금 상태 요약(변동성/방향성/관망 여부)
(2) 리스크(급락/급등/유동성/스프레드/신뢰도 이슈)
(3) 체크포인트(어떤 수치/조건을 보면 좋나)
(4) 한 줄 결론(매수/매도 지시 금지, 관망/주의/정보 요약만)`;
  }, []);

  return (
    <main className="w-full px-3 md:px-5 py-8">
      <div className="mx-auto w-full max-w-[1200px]">
        {/* ── 헤더 (코인 이름/이미지) ────────────────────── */}
        <div className="flex items-center gap-4 mb-6">
          {imageUrl && (
            <img
              src={imageUrl}
              alt={name}
              width={48}
              height={48}
              className="w-12 h-12 rounded-full bg-black/40 object-cover"
            />
          )}
          <div>
            <div className="text-2xl font-semibold">{name}</div>
            <div className="text-sm text-white/60">
              {symbol} · 기준 통화: {vs.toUpperCase()}
            </div>
          </div>
        </div>

        {/* ── 상단 3박스 ─ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          {/* 현재가 */}
          <div className="min-h-[110px] rounded-3xl border-[2.5px] border-cyan-400/80 bg-[#020617]/95 shadow-[0_0_40px_rgba(0,245,255,0.55)] px-8 py-6 flex flex-col justify-center">
            <div className="text-xs text-cyan-100/80 mb-2">현재가</div>
            <div className="text-2xl md:text-3xl font-bold tracking-tight text-cyan-400">
              {formatFiat(price, vs.toUpperCase())}
            </div>
          </div>

          {/* 시가총액 */}
          <div className="min-h-[110px] rounded-3xl border-[2.5px] border-amber-300/90 bg-[#020617]/95 shadow-[0_0_40px_rgba(252,211,77,0.55)] px-8 py-6 flex flex-col justify-center">
            <div className="text-xs text-amber-100/90 mb-2">시가총액</div>
            <div className="text-2xl md:text-3xl font-bold tracking-tight text-amber-300">
              {formatFiat(mc, vs.toUpperCase())}
            </div>
          </div>

          {/* 24h 거래량 */}
          <div className="min-h-[110px] rounded-3xl border-[2.5px] border-emerald-400/90 bg-[#020617]/95 shadow-[0_0_40px_rgba(16,185,129,0.55)] px-8 py-6 flex flex-col justify-center">
            <div className="text-xs text-emerald-100/90 mb-2">24h 거래량</div>
            <div className="text-2xl md:text-3xl font-bold tracking-tight text-emerald-300">
              {formatFiat(vol, vs.toUpperCase())}
            </div>
          </div>
        </div>

        {/* ── 1H / 24H / 7D / 스파크라인 ─ */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* 1H */}
          <div className="rounded-3xl bg-[#111827]/95 border border-white/10 px-6 py-4 flex flex-col justify-center">
            <div className="text-xs text-white/60 mb-2">1H</div>
            <div className={`text-2xl font-semibold ${pctClass(p1h)}`}>
              {formatPct(p1h)}
            </div>
          </div>

          {/* 24H */}
          <div className="rounded-3xl bg-[#111827]/95 border border-white/10 px-6 py-4 flex flex-col justify-center">
            <div className="text-xs text-white/60 mb-2">24H</div>
            <div className={`text-2xl font-semibold ${pctClass(p24h)}`}>
              {formatPct(p24h)}
            </div>
          </div>

          {/* 7D */}
          <div className="rounded-3xl bg-[#111827]/95 border border-white/10 px-6 py-4 flex flex-col justify-center">
            <div className="text-xs text-white/60 mb-2">7D</div>
            <div className={`text-2xl font-semibold ${pctClass(p7d)}`}>
              {formatPct(p7d)}
            </div>
          </div>

          {/* 스파크라인 박스 */}
          <div className="rounded-3xl bg-[#111827]/95 border border-white/10 px-6 py-4 flex flex-col justify-center">
            <div className="text-xs text-white/60 mb-2">스파크라인</div>
            <div className="flex-1 flex items-center text-[11px] text-white/45">
              스파크라인 데이터 준비 중입니다.
            </div>
          </div>
        </div>

        {/* ── Premium 배너 ─ */}
        <section className="mb-10">
          <PremiumBanner />
        </section>

        {/* ── 가격 차트 (TradingView) ─ */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-white/60">
              가격 차트 ·{" "}
              <span className="text-white/80">source: TradingView</span>
            </div>
          </div>

          <TradingViewChart cgId={coinId} symbol={symbol} />
        </section>

        {/* ✅ AI 분석 */}
        <section className="mb-10">
          <AiBox
            context={aiContext}
            title="🤖 CAIN AI 분석 (코인)"
            defaultPrompt={defaultPrompt}
            placeholder="예) 지금 상태를 관망/주의/관심으로 분류해줘 + 근거 3개"
            helperText="* 이 코인의 핵심 지표/거래소 티커 요약만 AI에 전달됩니다."
            endpoint="/api/ai/analyze"
            showDebug={false}
          />
        </section>

        {/* ── 거래소별 시세 테이블 ─ */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">거래소별 시세 (상위 50)</h2>
            <div className="text-xs text-white/50">
              source: coin-tickers · CoinGecko
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">거래소</th>
                  <th className="px-4 py-3 text-center">페어</th>
                  <th className="px-4 py-3 text-center">가격(USD)</th>
                  <th className="px-4 py-3 text-center">24H 거래량(USD)</th>
                  <th className="px-4 py-3 text-center">스프레드(%)</th>
                  <th className="px-4 py-3 text-center">신뢰도</th>
                  <th className="px-4 py-3 text-center">링크</th>
                </tr>
              </thead>
              <tbody>
                {tickersLoading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-sm text-white/55"
                    >
                      거래소별 시세 불러오는 중입니다...
                    </td>
                  </tr>
                ) : (tickers || []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-sm text-white/50"
                    >
                      거래소별 시세 데이터를 불러오지 못했습니다.
                      {tickersErr ? (
                        <span className="block mt-2 text-[11px] text-white/35">
                          error: {tickersErr}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ) : (
                  (tickers || []).map((t, idx) => {
                    const logo =
                      typeof t.market_logo === "string" ? t.market_logo : "";
                    const volUsd = t.volume ?? null;

                    return (
                      <tr
                        key={`${t.market || "m"}-${t.base}-${t.target}-${idx}`}
                        className="border-t border-white/5 hover:bg-white/5"
                      >
                        {/* 거래소명 + 로고 */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {logo && (
                              <img
                                src={logo}
                                alt={t.market || ""}
                                width={18}
                                height={18}
                                className="w-5 h-5 rounded-full bg-black/60 object-cover"
                              />
                            )}
                            <span>{t.market}</span>
                          </div>
                        </td>

                        {/* 페어 */}
                        <td className="px-4 py-3 text-center">
                          {t.pair_label ?? `${t.base}/${t.target}`}
                        </td>

                        {/* 가격 */}
                        <td className="px-4 py-3 text-center">
                          {t.last != null
                            ? t.last.toLocaleString("en-US", {
                                style: "currency",
                                currency: "USD",
                                maximumFractionDigits: 4,
                              })
                            : "-"}
                        </td>

                        {/* 24h 거래량 */}
                        <td className="px-4 py-3 text-center">
                          {volUsd != null
                            ? volUsd.toLocaleString("en-US", {
                                style: "currency",
                                currency: "USD",
                                maximumFractionDigits: 0,
                              })
                            : "-"}
                        </td>

                        {/* 스프레드 */}
                        <td className="px-4 py-3 text-center">
                          {t.bid_ask_spread_percentage != null
                            ? `${t.bid_ask_spread_percentage.toFixed(2)}%`
                            : "-"}
                        </td>

                        {/* 신뢰도 */}
                        <td className="px-4 py-3 text-center">
                          <span
                            className={
                              "inline-block w-3 h-3 rounded-full " +
                              trustDotClass(t.trust_score)
                            }
                            title={t.trust_score || undefined}
                          />
                        </td>

                        {/* 링크 */}
                        <td className="px-4 py-3 text-center">
                          {t.trade_url ? (
                            <a
                              href={t.trade_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-[var(--brand)] underline"
                            >
                              거래
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
