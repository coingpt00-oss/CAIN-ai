// src/app/airdrops/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

type AirdropMode = "live" | "notice" | "target" | "ended" | "region";

type AirdropRow = {
  id: string;
  created_at: string;
  updated_at: string | null;
  publish_at: string | null;

  title: string;
  description_short: string | null;
  summary_ko?: string | null;

  exchange: string | null;
  source: string;
  chain: string | null;

  grade: string | null;
  has_reward: boolean | null;
  is_active: boolean | null;
  pre_filter: string | null;

  reward_usd_lo: number | null;
  reward_usd_hi: number | null;
  reward_token: string | null;
  reward_hint: string | null;
  reward_detail: string | null;
  eligibility: string | null;
  risk_note: string | null;

  link_url: string | null;
  canonical_url?: string | null;
};

type ApiResponse =
  | { ok: true; items: AirdropRow[]; mode?: string; updatedAt: string }
  | { ok: false; items?: []; error: string; updatedAt?: string };

const MODE_TABS: { key: AirdropMode; label: string; desc: string }[] = [
  { key: "live", label: "진행중", desc: "현재 참여 가능성이 높은 에어드랍입니다." },
  { key: "notice", label: "지급 안내", desc: "지급 완료/분배 확인용 공지입니다." },
  { key: "target", label: "대상자 확인", desc: "과거 보유자·스냅샷 대상 확인 항목입니다." },
  { key: "ended", label: "종료/기록", desc: "종료된 에어드랍 기록입니다." },
  { key: "region", label: "지역 제한", desc: "한국 제한 또는 지역 조건 확인이 필요한 항목입니다." },
];

function norm(v?: string | null) {
  return String(v || "").trim().toLowerCase();
}

function exchangeKey(exchange: string | null, source: string) {
  const v = norm(exchange);
  if (v) return v;

  const s = norm(source);

  for (const k of [
    "binance",
    "bybit",
    "okx",
    "bitget",
    "bithumb",
    "upbit",
    "coinone",
    "korbit",
  ]) {
    if (s.includes(k)) return k;
  }

  return "unknown";
}

function exchangeName(exchange: string | null, source: string) {
  const k = exchangeKey(exchange, source);

  if (k === "binance") return "BINANCE";
  if (k === "bybit") return "BYBIT";
  if (k === "okx") return "OKX";
  if (k === "bitget") return "BITGET";
  if (k === "bithumb") return "BITHUMB";
  if (k === "upbit") return "UPBIT";
  if (k === "coinone") return "COINONE";
  if (k === "korbit") return "KORBIT";

  return "거래소";
}

function exchangePillClass(key: string) {
  if (key === "binance") return "border-[#F0B90B]/70 bg-[#F0B90B]/14 text-[#F0B90B]";
  if (key === "bybit") return "border-[#263454]/80 bg-[#111A2E] text-white";
  if (key === "okx") return "border-white/75 bg-black text-white";
  if (key === "bitget") return "border-[#22E6F1]/75 bg-[#22E6F1]/14 text-[#22E6F1]";
  if (key === "upbit") return "border-[#0052D9]/70 bg-[#0052D9]/18 text-[#5EA2FF]";
  if (key === "bithumb") return "border-[#FF7A00]/75 bg-[#FF7A00]/18 text-[#FF8A1E]";
  if (key === "coinone") return "border-[#0C6BFF]/70 bg-[#0C6BFF]/14 text-[#59B6FF]";
  if (key === "korbit") return "border-black bg-white text-black";

  return "border-white/10 bg-white/[0.05] text-white/70";
}

function ExchangePill({
  exchange,
  source,
}: {
  exchange: string | null;
  source: string;
}) {
  const key = exchangeKey(exchange, source);
  const label = exchangeName(exchange, source);

  if (key === "bybit") {
    return (
      <span
        className={`rounded-full border px-3 py-1 text-xs font-bold tracking-wide ${exchangePillClass(
          key
        )}`}
      >
        BYB<span className="text-[#F5B51B]">I</span>T
      </span>
    );
  }

  if (key === "coinone") {
    return (
      <span
        className={`rounded-full border px-3 py-1 text-xs font-bold tracking-wide ${exchangePillClass(
          key
        )}`}
      >
        <span className="bg-gradient-to-r from-[#2A63FF] via-[#1F9BFF] to-[#58D2FF] bg-clip-text text-transparent">
          COINONE
        </span>
      </span>
    );
  }

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold tracking-wide ${exchangePillClass(
        key
      )}`}
    >
      {label}
    </span>
  );
}

function gradeText(grade?: string | null) {
  const g = String(grade || "").toUpperCase();

  if (g === "A") return "A 등급";
  if (g === "B") return "B 등급";
  if (g === "C") return "C 등급";

  return "등급 미정";
}

function gradeClass(grade?: string | null) {
  const g = String(grade || "").toUpperCase();

  if (g === "A") return "border-red-400/40 bg-red-500/15 text-red-200";
  if (g === "B") return "border-emerald-400/40 bg-emerald-500/15 text-emerald-200";
  if (g === "C") return "border-amber-400/35 bg-amber-500/12 text-amber-200";

  return "border-white/10 bg-white/[0.05] text-white/60";
}

function statusBadge(item: AirdropRow) {
  const pf = norm(item.pre_filter);

  if (item.is_active === true && !pf) {
    return {
      label: "진행중",
      cls: "border-emerald-400/40 bg-emerald-500/12 text-emerald-200",
    };
  }

  if (pf === "distribution_notice") {
    return {
      label: "지급 안내",
      cls: "border-blue-400/40 bg-blue-500/12 text-blue-200",
    };
  }

  if (pf === "target_check_notice") {
    return {
      label: "대상자 확인",
      cls: "border-purple-400/40 bg-purple-500/12 text-purple-200",
    };
  }

  if (pf === "expired_or_result_notice") {
    return {
      label: "종료/기록",
      cls: "border-white/15 bg-white/[0.05] text-white/60",
    };
  }

  if (pf === "region_restricted_or_unclear") {
    return {
      label: "지역 제한",
      cls: "border-orange-400/40 bg-orange-500/12 text-orange-200",
    };
  }

  return {
    label: "확인 필요",
    cls: "border-white/10 bg-white/[0.05] text-white/60",
  };
}

function categoryBadges(item: AirdropRow) {
  const text = `${item.title || ""} ${item.reward_detail || ""} ${
    item.eligibility || ""
  } ${item.reward_hint || ""}`.toLowerCase();

  const tags: string[] = [];

  if (norm(item.pre_filter) === "distribution_notice") tags.push("지급 완료");
  if (norm(item.pre_filter) === "target_check_notice") tags.push("대상자 확인");
  if (text.includes("hodler") || text.includes("snapshot") || text.includes("스냅샷")) tags.push("스냅샷");
  if (text.includes("new user") || text.includes("신규")) tags.push("신규회원");
  if (
    text.includes("poolx") ||
    text.includes("earn") ||
    text.includes("apr") ||
    text.includes("stake") ||
    text.includes("예치") ||
    text.includes("락업")
  ) {
    tags.push("예치/Earn");
  }

  if (text.includes("candybomb")) tags.push("CandyBomb");
  if (text.includes("token splash")) tags.push("Token Splash");
  if (text.includes("jumpstart")) tags.push("Jumpstart");
  if (text.includes("원화마켓")) tags.push("상장 기념");

  return Array.from(new Set(tags)).slice(0, 4);
}

function formatNoticeTime(item: AirdropRow) {
  const raw = item.publish_at || item.created_at || item.updated_at;
  if (!raw) return "공지 시간 확인 필요";

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function rewardLine(item: AirdropRow) {
  if (item.reward_hint) return item.reward_hint;
  if (item.reward_detail) return item.reward_detail;

  if (item.reward_usd_lo !== null && item.reward_usd_hi !== null) {
    return `$${item.reward_usd_lo} ~ $${item.reward_usd_hi}`;
  }

  if (item.reward_token) return `${item.reward_token} 보상 가능성`;

  return "보상 조건은 상세/원문 확인 필요";
}

export default function AirdropsPage() {
  const router = useRouter();

  const [mode, setMode] = useState<AirdropMode>("live");
  const [items, setItems] = useState<AirdropRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);

        const res = await fetch(`/api/public/airdrops?mode=${mode}&limit=80`);
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
  }, [mode]);

  const selectedTab = MODE_TABS.find((x) => x.key === mode) || MODE_TABS[0];

  return (
    <main className="w-full px-4 py-8 md:px-5">
      <div className="mx-auto w-full max-w-[1200px] space-y-5">
        <section className="space-y-2">
          <h1 className="text-2xl font-semibold text-[var(--brand)]">
            에어드랍
          </h1>
          <p className="text-sm text-white/70">
            거래소별 진행중 에어드랍과 지급 안내, 대상자 확인 공지를 분리해서 확인하세요.
          </p>
        </section>

        <section className="flex flex-wrap gap-2">
          {MODE_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setMode(tab.key)}
              className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                mode === tab.key
                  ? "border-[var(--brand)]/70 bg-[var(--brand)]/15 text-[var(--brand)]"
                  : "border-white/10 bg-black/35 text-white/60 hover:text-white"
              }`}
              title={tab.desc}
            >
              {tab.label}
            </button>
          ))}
        </section>

        <div className="text-xs text-white/45">{selectedTab.desc}</div>

        <section className="space-y-3">
          {loading && (
            <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-sm text-white/70">
              불러오는 중입니다…
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-950/30 p-6 text-sm text-red-200">
              에어드랍 로딩 실패: {error}
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-sm text-white/70">
              현재 이 분류에 표시할 에어드랍이 없습니다.
            </div>
          )}

          {!loading &&
            !error &&
            items.map((item) => {
              const outUrl = item.link_url || item.canonical_url || null;
              const detailUrl = `/airdrops/${item.id}`;
              const st = statusBadge(item);
              const tags = categoryBadges(item);
              const noticeTime = formatNoticeTime(item);
              const rewardText = rewardLine(item);

              return (
                <article
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(detailUrl)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") router.push(detailUrl);
                  }}
                  className="cursor-pointer rounded-2xl border border-white/10 bg-gradient-to-br from-black/75 via-black/45 to-cyan-950/20 px-5 py-4 transition hover:border-[var(--brand)]/70 hover:bg-white/[0.03]"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <ExchangePill exchange={item.exchange} source={item.source} />

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${st.cls}`}
                        >
                          {st.label}
                        </span>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${gradeClass(
                            item.grade
                          )}`}
                        >
                          {gradeText(item.grade)}
                        </span>

                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-white/65"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      <h2 className="text-base font-semibold text-white md:text-lg">
                        {item.title}
                      </h2>

                      <div className="space-y-1 text-sm leading-6 text-white/60">
                        <p>
                          <span className="text-white/35">보상/성격: </span>
                          <span className="text-emerald-200/80">{rewardText}</span>
                        </p>
                        <p className="text-xs text-white/45">공지 시간: {noticeTime}</p>
                      </div>

                      {item.risk_note && (
                        <p className="text-xs leading-5 text-amber-200/70">
                          주의: {item.risk_note}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col justify-center items-end gap-2 md:w-44 md:self-center">
                      {outUrl && (
                        <a
                          href={outUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="w-full rounded-full border border-[var(--brand)]/60 bg-[var(--brand)]/10 px-3 py-2 text-center text-xs font-medium text-[var(--brand)] hover:bg-[var(--brand)]/20"
                        >
                          거래소 공지 보기
                        </a>
                      )}

                      <Link
                        href={detailUrl}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-center text-xs font-medium text-white/80 hover:bg-white/10"
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