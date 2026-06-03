// src/app/events/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

type EventItem = {
  id: string;
  source: string | null;
  title: string | null;
  url: string | null;
  categories: string[] | null;
  is_event: boolean | null;
  published_at: string | null;
  created_at: string | null;
  updated_at?: string | null;

  grade_hint?: string | null;
  reward_certainty?: string | null;
  reward_type?: string | null;
  new_user_only?: boolean | null;
  reward_detail?: string | null;
  eligibility?: string | null;
  risk_note?: string | null;
  pre_filter?: string | null;
  is_active?: boolean | null;

  reward_rate_text?: string | null;
  reward_cap_text?: string | null;
  required_action?: string | null;
  event_start_at?: string | null;
  event_end_at?: string | null;
};

function norm(v?: string | null) {
  return String(v || "").trim().toLowerCase();
}

function fmtNoticeTime(it: EventItem) {
  const s = it.published_at || it.created_at;
  if (!s) return "공지 시간 확인 필요";

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function sourceKey(source?: string | null) {
  const s = norm(source);

  for (const k of [
    "binance",
    "bybit",
    "okx",
    "bitget",
    "upbit",
    "bithumb",
    "coinone",
    "korbit",
  ]) {
    if (s.includes(k)) return k;
  }

  return s || "unknown";
}

function sourceLabel(source?: string | null) {
  const s = sourceKey(source);

  if (s === "binance") return "BINANCE";
  if (s === "bybit") return "BYBIT";
  if (s === "okx") return "OKX";
  if (s === "bitget") return "BITGET";
  if (s === "upbit") return "UPBIT";
  if (s === "bithumb") return "BITHUMB";
  if (s === "coinone") return "COINONE";
  if (s === "korbit") return "KORBIT";

  return "UNKNOWN";
}

function sourceClass(source?: string | null) {
  const s = sourceKey(source);

  if (s === "binance") return "border-[#F0B90B]/70 bg-[#F0B90B]/14 text-[#F0B90B]";
  if (s === "bybit") return "border-[#263454]/80 bg-[#111A2E] text-white";
  if (s === "okx") return "border-white/75 bg-black text-white";
  if (s === "bitget") return "border-[#22E6F1]/75 bg-[#22E6F1]/14 text-[#22E6F1]";
  if (s === "upbit") return "border-[#0052D9]/70 bg-[#0052D9]/18 text-[#5EA2FF]";
  if (s === "bithumb") return "border-[#FF7A00]/75 bg-[#FF7A00]/18 text-[#FF8A1E]";
  if (s === "coinone") return "border-[#0C6BFF]/70 bg-[#0C6BFF]/14 text-[#59B6FF]";
  if (s === "korbit") return "border-black bg-white text-black";

  return "border-white/10 bg-white/[0.05] text-white/70";
}

function ExchangePill({ source }: { source?: string | null }) {
  const s = sourceKey(source);
  const label = sourceLabel(source);

  if (s === "bybit") {
    return (
      <span
        className={`rounded-full border px-3 py-1 text-xs font-bold tracking-wide ${sourceClass(source)}`}
      >
        BYB<span className="text-[#F5B51B]">I</span>T
      </span>
    );
  }

  if (s === "coinone") {
    return (
      <span
        className={`rounded-full border px-3 py-1 text-xs font-bold tracking-wide ${sourceClass(source)}`}
      >
        <span className="bg-gradient-to-r from-[#2A63FF] via-[#1F9BFF] to-[#58D2FF] bg-clip-text text-transparent">
          COINONE
        </span>
      </span>
    );
  }

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold tracking-wide ${sourceClass(source)}`}
    >
      {label}
    </span>
  );
}

function gradeClass(g?: string | null) {
  const v = String(g || "").toUpperCase();

  if (v === "A") return "border-red-400/40 bg-red-500/12 text-red-200";
  if (v === "B") return "border-emerald-400/40 bg-emerald-500/12 text-emerald-200";
  if (v === "C") return "border-amber-400/40 bg-amber-500/12 text-amber-200";

  return "border-white/10 bg-white/[0.05] text-white/55";
}

function statusBadge(it: EventItem) {
  if (norm(it.pre_filter) === "distribution_or_result_notice") {
    return {
      label: "지급/결과 안내",
      cls: "border-blue-400/40 bg-blue-500/12 text-blue-200",
    };
  }

  if (it.is_active === true) {
    return {
      label: "진행중",
      cls: "border-emerald-400/40 bg-emerald-500/12 text-emerald-200",
    };
  }

  return {
    label: "확인 필요",
    cls: "border-white/10 bg-white/[0.05] text-white/60",
  };
}

function categoryBadges(it: EventItem) {
  const text = `${it.title || ""} ${it.reward_detail || ""} ${
    it.eligibility || ""
  } ${it.reward_type || ""} ${it.required_action || ""}`.toLowerCase();

  const tags: string[] = [];

  if (it.new_user_only) tags.push("신규회원");
  if (text.includes("vip")) tags.push("VIP");

  if (
    text.includes("refer") ||
    text.includes("referral") ||
    text.includes("추천") ||
    text.includes("초대")
  ) {
    tags.push("추천");
  }

  if (
    text.includes("earn") ||
    text.includes("apr") ||
    text.includes("stake") ||
    text.includes("예치") ||
    text.includes("락업")
  ) {
    tags.push("Earn/APR");
  }

  if (text.includes("trading") || text.includes("trade") || text.includes("거래")) {
    tags.push("거래 미션");
  }

  if (text.includes("fee") || text.includes("수수료")) tags.push("수수료");

  if (
    text.includes("quiz") ||
    text.includes("word of the day") ||
    text.includes("퀴즈")
  ) {
    tags.push("퀴즈");
  }

  if (text.includes("airdrop") || text.includes("에어드랍")) tags.push("에어드랍");
  if (norm(it.reward_certainty) === "guaranteed") tags.push("확정 보상");
  if (norm(it.reward_certainty) === "lottery") tags.push("추첨형");

  return Array.from(new Set(tags)).slice(0, 5);
}

function rewardLine(it: EventItem) {
  if (it.reward_detail) return it.reward_detail;
  if (it.reward_rate_text) return `보상률/수익률: ${it.reward_rate_text}`;
  if (it.reward_cap_text) return `지급 한도: ${it.reward_cap_text}`;
  if (it.reward_type === "trading_mission") return "입금/거래 미션형 이벤트";

  return "보상 조건은 상세/원문 확인 필요";
}

export default function EventsPage() {
  const router = useRouter();

  const [items, setItems] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [mode, setMode] = useState<"all" | "live" | "notice">("all");

  const filtered = useMemo(() => {
    if (!sourceFilter) return items;
    return items.filter((x) => sourceKey(x.source) === sourceFilter);
  }, [items, sourceFilter]);

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch(`/api/public/events?limit=100&mode=${mode}`);
        const json = await res.json();

        if (!json?.ok) throw new Error(json?.error || "fetch_failed");
        if (!mounted) return;

        setItems(Array.isArray(json.items) ? json.items : []);
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message || "unknown_error");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    run();

    return () => {
      mounted = false;
    };
  }, [mode]);

  return (
    <main className="w-full px-3 py-8 md:px-5">
      <div className="mx-auto w-full max-w-[1200px] space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--brand)]">
              이벤트
            </h1>
            <p className="mt-2 text-sm text-white/60">
              거래소별 보상형 이벤트를 유형 배지와 함께 확인하세요.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
              className="rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white/80 outline-none"
            >
              <option value="all">전체</option>
              <option value="live">진행중</option>
              <option value="notice">지급/결과 안내</option>
            </select>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white/80 outline-none"
            >
              <option value="">거래소 전체</option>
              <option value="upbit">업비트</option>
              <option value="bithumb">빗썸</option>
              <option value="coinone">코인원</option>
              <option value="korbit">코빗</option>
              <option value="binance">바이낸스</option>
              <option value="bybit">바이비트</option>
              <option value="okx">OKX</option>
              <option value="bitget">비트겟</option>
            </select>

            <button
              onClick={() => location.reload()}
              className="rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white/70 hover:text-white"
            >
              새로고침
            </button>
          </div>
        </div>

        {loading && (
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-sm text-white/70">
            불러오는 중입니다…
          </div>
        )}

        {!loading && err && (
          <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-6 text-sm text-red-200">
            이벤트 로딩 실패: {err}
          </div>
        )}

        {!loading && !err && filtered.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-sm text-white/70">
            아직 표시할 이벤트가 없습니다.
          </div>
        )}

        {!loading && !err && filtered.length > 0 && (
          <div className="grid grid-cols-1 gap-4">
            {filtered.map((it) => {
              const when = fmtNoticeTime(it);
              const detailUrl = `/events/${it.id}`;
              const st = statusBadge(it);
              const tags = categoryBadges(it);

              return (
                <article
                  key={it.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(detailUrl)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") router.push(detailUrl);
                  }}
                  className="cursor-pointer rounded-2xl border border-white/10 bg-black/40 p-5 transition hover:border-[var(--brand)]/60 hover:bg-white/[0.03]"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <ExchangePill source={it.source} />

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${st.cls}`}
                        >
                          {st.label}
                        </span>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${gradeClass(
                            it.grade_hint
                          )}`}
                        >
                          {it.grade_hint
                            ? `${String(it.grade_hint).toUpperCase()} 등급`
                            : "등급 미정"}
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

                      <h2 className="break-words text-base font-semibold text-white">
                        {it.title || "(제목 없음)"}
                      </h2>

                      <div className="space-y-1 text-sm leading-6 text-white/60">
                        <p>
                          <span className="text-white/35">보상/성격: </span>
                          {rewardLine(it)}
                        </p>
                        <p className="text-xs text-white/45">공지 시간: {when}</p>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col justify-center gap-3 md:w-56 md:self-center md:items-end">
                      <div className="flex w-full flex-col gap-2">
                        <a
                          href={it.url || "#"}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center justify-center rounded-full border border-[rgba(18,203,255,0.35)] bg-[rgba(18,203,255,0.08)] px-4 py-2 text-sm text-[var(--brand)] hover:bg-[rgba(18,203,255,0.14)]"
                        >
                          거래소 공지 보기
                        </a>

                        <Link
                          href={detailUrl}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/80 hover:bg-white/10"
                        >
                          상세 보기
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}