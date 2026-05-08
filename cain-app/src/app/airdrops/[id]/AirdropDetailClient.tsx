// src/app/airdrops/[id]/AirdropDetailClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { rewardUsdText } from "@/lib/airdropReward";
import AiBox from "@/components/ai/AiBox"; // ✅ 추가

type AirdropRow = {
  id: string;
  created_at: string;
  updated_at: string | null;

  source: string;
  source_id: string | null;

  title: string;
  description_short: string | null;

  exchange: string | null; // "binance" | "okx" | "bitget" | "bybit"
  grade: string | null;

  reward_usd_lo?: number | null;
  reward_usd_hi?: number | null;
  reward_token?: string | null;

  link_url?: string | null;
  detail_excerpt?: string | null;
  url?: string | null;
};

type ApiResponse =
  | { ok: true; item: AirdropRow; updatedAt?: string }
  | { ok: false; error: string; detail?: any };

export const dynamic = "force-dynamic";

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

/** ✅ 목록과 동일: 거래소 텍스트 컬러 */
function exchangeTextClass(exKey: string) {
  switch (exKey) {
    case "binance":
      return "text-[#F0B90B]";
    case "okx":
      return "text-white";
    case "bitget":
      return "text-[#00D1FF]";
    case "bybit":
      return "text-[#7C6BFF]";
    default:
      return "text-white/80";
  }
}

/** ✅ 거래소 배지 배경도 살짝 맞춰주기 */
function exchangePillClass(exKey: string) {
  switch (exKey) {
    case "binance":
      return "border-[#F0B90B]/35 bg-[#F0B90B]/10";
    case "okx":
      return "border-white/20 bg-white/5";
    case "bitget":
      return "border-[#00D1FF]/35 bg-[#00D1FF]/10";
    case "bybit":
      return "border-[#7C6BFF]/35 bg-[#7C6BFF]/10";
    default:
      return "border-white/10 bg-white/5";
  }
}

function gradeBadge(grade: string | null | undefined) {
  const g = (grade || "").toUpperCase();
  if (g === "A") return "bg-red-500/15 text-red-200 border border-red-400/40";
  if (g === "B")
    return "bg-emerald-500/15 text-emerald-200 border border-emerald-400/40";
  return "bg-slate-700/40 text-slate-200 border border-white/10";
}

function gradeText(grade: string | null | undefined) {
  const g = (grade || "").toUpperCase();
  if (g === "A") return "A 등급";
  if (g === "B") return "B 등급";
  return "등급 미정";
}

function normalizeRewardText(txt: string) {
  const v = (txt || "").trim();
  const lower = v.toLowerCase();

  if (
    !v ||
    v === "-" ||
    v === "정보 없음" ||
    v === "정보없음" ||
    v === "정보 없음." ||
    lower.includes("no data") ||
    lower.includes("unknown") ||
    lower.includes("n/a")
  ) {
    return "추정불가";
  }
  return v;
}

export default function AirdropDetailClient({ id }: { id: string }) {
  const [item, setItem] = useState<AirdropRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/public/airdrops/${id}`, { cache: "no-store" });
        const json = (await res.json()) as ApiResponse;

        if (!res.ok || !json.ok) {
          if (!cancelled) {
            setError((json as any)?.error || `http_${res.status}`);
            setLoading(false);
          }
          return;
        }

        if (!cancelled) {
          setItem(json.item);
          setLoading(false);
        }
      } catch (err) {
        console.error("[AIRDROP_DETAIL] fetch error", err);
        if (!cancelled) {
          setError("network_error");
          setLoading(false);
        }
      }
    }

    if (id) load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const outUrl = useMemo(() => item?.link_url ?? item?.url ?? null, [item]);

  const exLabel = useMemo(() => (item ? exchangeName(item.exchange, item.source) : ""), [item]);
  const exKey = useMemo(() => (item ? exchangeKey(item.exchange, item.source) : "unknown"), [item]);

  const rewardText = useMemo(() => {
    if (!item) return "";
    const raw = rewardUsdText(item as any);
    return normalizeRewardText(raw);
  }, [item]);

  const rewardIsUnknown = rewardText === "추정불가";

  const excerpt = useMemo(() => {
    const v = (item?.detail_excerpt || "").trim();
    if (v) return v;
    const d = (item?.description_short || "").trim();
    return d || "";
  }, [item]);

  // ✅ AI로 보낼 컨텍스트(핵심만)
  const aiContext = useMemo(() => {
    if (!item) return null;
    return {
      type: "airdrop",
      id: item.id,
      source: item.source,
      source_id: item.source_id,
      title: item.title,
      exchange: item.exchange,
      grade: item.grade,
      reward_usd_lo: item.reward_usd_lo ?? null,
      reward_usd_hi: item.reward_usd_hi ?? null,
      reward_token: item.reward_token ?? null,
      description_short: item.description_short ?? null,
      excerpt: excerpt || null,
      url: outUrl,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  }, [item, excerpt, outUrl]);

  return (
    <main className="w-full px-4 py-8 md:px-5">
      <div className="mx-auto w-full max-w-[900px] space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/airdrops"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
          >
            ← 에어드랍 목록으로
          </Link>
        </div>

        {loading && (
          <div className="rounded-2xl border border-white/10 bg-black/40 px-5 py-6 text-sm text-white/70">
            에어드랍 정보를 불러오는 중입니다…
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-500/40 bg-red-950/40 px-5 py-6 text-sm text-red-200">
            에어드랍 정보를 불러오는 중 오류가 발생했습니다. (코드: {error})
          </div>
        )}

        {!loading && !error && item && (
          <>
            <article className="space-y-5 rounded-2xl border border-white/10 bg-gradient-to-br from-black/80 via-black/50 to-cyan-950/30 px-6 py-6">
              <header className="space-y-2">
                <h1 className="text-xl font-semibold text-white md:text-2xl">{item.title}</h1>
                {item.description_short && (
                  <p className="text-sm text-white/70">{item.description_short}</p>
                )}
              </header>

              <section className="grid gap-4 md:grid-cols-2">
                {/* 좌측 */}
                <div className="space-y-4">
                  {/* 거래소 */}
                  <div className="space-y-1">
                    <div className="text-xs text-white/50">거래소</div>

                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-[13px] font-semibold ${exchangePillClass(
                          exKey
                        )}`}
                      >
                        <span className={exchangeTextClass(exKey)}>{exLabel}</span>
                      </span>
                    </div>
                  </div>

                  {/* 예상 보상 + 등급 */}
                  <div className="space-y-1">
                    <div className="text-xs text-white/50">예상 보상</div>

                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <div
                        className={`text-sm font-semibold ${
                          rewardIsUnknown ? "text-white/45" : "text-emerald-200/90"
                        }`}
                      >
                        {rewardText}
                      </div>

                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-[13px] font-semibold ${gradeBadge(
                          item.grade
                        )}`}
                        title="에어드랍 등급"
                      >
                        {gradeText(item.grade)}
                      </span>
                    </div>
                  </div>

                  {outUrl && (
                    <section>
                      <a
                        href={outUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-full border border-[var(--brand)]/60 bg-[var(--brand)]/10 px-4 py-2 text-sm font-medium text-[var(--brand)] hover:bg-[var(--brand)]/20"
                      >
                        거래소 공지 바로가기
                      </a>
                    </section>
                  )}
                </div>

                {/* 우측: 원문 발췌 */}
                <div className="space-y-2">
                  <div className="text-xs text-white/50">원문 (간단 발췌)</div>

                  {excerpt ? (
                    <div className="max-h-[260px] overflow-auto rounded-xl border border-white/10 bg-black/40 p-4 text-sm leading-6 text-white/70 whitespace-pre-wrap">
                      {excerpt}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-sm text-white/45">
                      원문 발췌가 아직 없습니다.
                    </div>
                  )}
                </div>
              </section>

              <footer className="text-[11px] text-white/40">
                ※ CAIN은 에어드랍 정보 제공만 담당하며, 실제 참여 과정에서 발생하는 손실/위험은 사용자 본인 책임입니다.
              </footer>
            </article>

            {/* ✅ AI 분석 박스 추가 */}
            {aiContext ? (
              <AiBox
                context={aiContext}
                title="🤖 CAIN AI 분석 (에어드랍)"
                buttonLabel="AI로 분석하기"
                placeholder="예) 참여 난이도 / 리스크 / 기대 가치 / 주의할 점을 정리해줘"
                helperText="* 이 에어드랍의 핵심 데이터만 AI에 전달됩니다."
                defaultPrompt="이 에어드랍을 참여 관점에서 요약해줘. (1) 참여 난이도/단계 (2) 리스크/주의점 (3) 기대가치/보상 추정 해석 (4) 한 줄 결론"
                showDebug={false}
              />
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
