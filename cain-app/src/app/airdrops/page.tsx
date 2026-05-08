//src/app/airdrops/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { rewardUsdText } from "@/lib/airdropReward";

type AirdropRow = {
  id: string;
  created_at: string;
  updated_at: string | null;

  title: string;
  description_short: string | null;

  exchange: string | null;
  source: string;
  chain: string | null;

  grade?: string | null;
  has_reward?: boolean | null;

  reward_usd_lo?: number | null;
  reward_usd_hi?: number | null;
  reward_token?: string | null;
  link_url?: string | null;

  url?: string | null;
};

type ApiResponse =
  | { ok: true; items: AirdropRow[]; updatedAt: string }
  | { ok: false; error: string; updatedAt?: string };

export const dynamic = "force-dynamic";

/* ---------- 거래소 이름 / 키 ---------- */
function exchangeName(ex: string | null, source: string) {
  const v = (ex || "").toLowerCase();
  if (v === "binance") return "Binance";
  if (v === "okx") return "OKX";
  if (v === "bybit") return "Bybit";
  if (v === "bitget") return "Bitget";

  const s = (source || "").toLowerCase();
  if (s.includes("binance")) return "Binance";
  if (s.includes("okx")) return "OKX";
  if (s.includes("bybit")) return "Bybit";
  if (s.includes("bitget")) return "Bitget";
  return "Exchange";
}

function exchangeKey(ex: string | null, source: string) {
  const v = (ex || "").toLowerCase();
  if (v) return v;

  const s = (source || "").toLowerCase();
  if (s.includes("binance")) return "binance";
  if (s.includes("okx")) return "okx";
  if (s.includes("bybit")) return "bybit";
  if (s.includes("bitget")) return "bitget";
  return "unknown";
}

/* ---------- 거래소 컬러 ---------- */
function exchangeTextClass(exKey: string) {
  switch (exKey) {
    case "binance":
      return "text-[#F0B90B]";
    case "okx":
      return "text-white";
    case "bitget":
      return "text-[#00D1FF]";
    case "bybit":
      // ✅ 최종 확정: 퍼플
      return "text-[#7C6BFF]";
    default:
      return "text-white/80";
  }
}

/* ---------- 등급 ---------- */
function gradeBadge(grade: string | null | undefined) {
  const g = (grade || "").toUpperCase();
  if (g === "A") {
    return "bg-red-500/15 text-red-300 border border-red-400/40";
  }
  if (g === "B") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-400/40";
  }
  return "bg-slate-700/40 text-slate-200 border border-white/10";
}

function gradeText(grade: string | null | undefined) {
  const g = (grade || "").toUpperCase();
  if (g === "A") return "A 등급";
  if (g === "B") return "B 등급";
  return "등급 미정";
}

/* ---------- 보상 텍스트 ---------- */
function normalizeRewardText(txt: string) {
  const v = (txt || "").trim().toLowerCase();
  if (!v || v === "-" || v.includes("정보") || v.includes("unknown") || v.includes("n/a")) {
    return "추정불가";
  }
  return txt;
}

export default function AirdropsPage() {
  const [items, setItems] = useState<AirdropRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/public/airdrops?grade=A,B&limit=50", {
          cache: "no-store",
        });
        const json = (await res.json()) as ApiResponse;

        if (!json.ok) {
          if (!cancelled) {
            setError(json.error || "api_error");
            setLoading(false);
          }
          return;
        }

        if (!cancelled) {
          setItems(json.items || []);
          setError(null);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("network_error");
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const list = useMemo(() => items || [], [items]);

  return (
    <main className="w-full px-4 py-8 md:px-5">
      <div className="mx-auto w-full max-w-[1200px] space-y-5">
        <section className="space-y-2">
          <h1 className="text-2xl font-semibold text-[var(--brand)]">에어드랍</h1>
          <p className="text-sm text-white/70">
            CEX / 메이저 거래소에서 진행중인 안전한 에어드랍 정보들을 확인하세요.
          </p>
        </section>

        <section className="space-y-3">
          {!loading &&
            !error &&
            list.map((item) => {
              const outUrl = item.link_url ?? item.url ?? null;
              const exLabel = exchangeName(item.exchange, item.source);
              const exKey = exchangeKey(item.exchange, item.source);

              const rewardTextRaw = rewardUsdText(item);
              const rewardText = normalizeRewardText(rewardTextRaw);
              const rewardMuted = rewardText === "추정불가";

              return (
                <article
                  key={item.id}
                  className="rounded-2xl border border-white/8 bg-gradient-to-br from-black/70 via-black/40 to-cyan-950/20 px-5 py-4 transition hover:border-[var(--brand)]/70"
                >
                  <div className="flex flex-col gap-3 md:flex-row">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-semibold">
                          <span className={exchangeTextClass(exKey)}>{exLabel}</span>
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-sm font-medium ${gradeBadge(
                            item.grade
                          )}`}
                        >
                          {gradeText(item.grade)}
                        </span>
                      </div>

                      <h2 className="text-base font-semibold text-white md:text-lg">
                        {item.title}
                      </h2>

                      {item.description_short && (
                        <p className="text-sm text-white/60">{item.description_short}</p>
                      )}

                      <p
                        className={`text-sm ${
                          rewardMuted ? "text-white/50" : "text-emerald-300/80"
                        }`}
                      >
                        예상 보상: {rewardText}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2 md:w-44">
                      {outUrl && (
                        <a
                          href={outUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full rounded-full border border-[var(--brand)]/60 bg-[var(--brand)]/10 px-3 py-2 text-xs font-medium text-[var(--brand)] hover:bg-[var(--brand)]/20 text-center"
                        >
                          거래소 공지 보기
                        </a>
                      )}

                      <Link
                        href={`/airdrops/${item.id}`}
                        className="w-full rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 hover:bg-white/10 text-center"
                      >
                        상세 보기
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
        </section>
      </div>
    </main>
  );
}
