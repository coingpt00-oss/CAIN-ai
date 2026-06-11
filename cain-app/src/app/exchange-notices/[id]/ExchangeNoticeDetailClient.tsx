// src/app/exchange-notices/[id]/ExchangeNoticeDetailClient.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AiBox from "@/components/ai/AiBox";

type NoticeItem = {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  last_checked_at: string | null;

  source: string | null;
  source_id: string | null;
  exchange: string | null;

  title: string | null;
  summary_ko: string | null;
  url: string | null;

  category: string | null;
  notice_type: string | null;
  severity: string | null;

  symbols: string[] | null;
  chains: string[] | null;
  markets: string[] | null;

  published_at: string | null;
  modified_at: string | null;
  source_published_at: string | null;

  detail_excerpt: string | null;
  detail_fetch_status: string | null;
  detail_fetched_at: string | null;

  is_active: boolean | null;
  is_important: boolean | null;
};

type ApiResponse =
  | { ok: true; item: NoticeItem; updatedAt: string }
  | { ok: false; item: null; error: string; detail?: any; updatedAt?: string };

function norm(v?: string | null) {
  return String(v || "").trim().toLowerCase();
}

function exchangeKey(v?: string | null) {
  const s = norm(v);
  for (const k of ["upbit", "bithumb", "coinone", "korbit", "binance", "bybit", "bitget", "okx"]) {
    if (s.includes(k)) return k;
  }
  return s || "unknown";
}

function exchangeLabel(v?: string | null) {
  const k = exchangeKey(v);
  if (k === "upbit") return "UPBIT";
  if (k === "bithumb") return "BITHUMB";
  if (k === "coinone") return "COINONE";
  if (k === "korbit") return "KORBIT";
  if (k === "binance") return "BINANCE";
  if (k === "bybit") return "BYBIT";
  if (k === "bitget") return "BITGET";
  if (k === "okx") return "OKX";
  return "UNKNOWN";
}

function exchangePillClass(v?: string | null) {
  const k = exchangeKey(v);
  if (k === "binance") return "border-[#F0B90B]/70 bg-[#F0B90B]/14 text-[#F0B90B]";
  if (k === "bybit") return "border-[#263454]/80 bg-[#111A2E] text-white";
  if (k === "okx") return "border-white/75 bg-black text-white";
  if (k === "bitget") return "border-[#22E6F1]/75 bg-[#22E6F1]/14 text-[#22E6F1]";
  if (k === "upbit") return "border-[#0052D9]/70 bg-[#0052D9]/18 text-[#5EA2FF]";
  if (k === "bithumb") return "border-[#FF7A00]/75 bg-[#FF7A00]/18 text-[#FF8A1E]";
  if (k === "coinone") return "border-[#0C6BFF]/70 bg-[#0C6BFF]/14 text-[#59B6FF]";
  if (k === "korbit") return "border-black bg-white text-black";
  return "border-white/10 bg-white/[0.05] text-white/70";
}

function ExchangePillLabel({ exchange }: { exchange?: string | null }) {
  const k = exchangeKey(exchange);
  const label = exchangeLabel(exchange);

  if (k === "bybit") {
    return (
      <>
        BYB<span className="text-[#F5B51B]">I</span>T
      </>
    );
  }

  if (k === "coinone") {
    return (
      <span className="bg-gradient-to-r from-[#2A63FF] via-[#1F9BFF] to-[#58D2FF] bg-clip-text text-transparent">
        COINONE
      </span>
    );
  }

  return <>{label}</>;
}

function categoryLabel(v?: string | null) {
  const k = norm(v);
  if (k === "deposit_withdrawal") return "입출금";
  if (k === "listing") return "상장";
  if (k === "delisting") return "상장폐지";
  if (k === "trading_update") return "거래변경";
  if (k === "futures_margin") return "선물마진";
  if (k === "maintenance") return "점검";
  if (k === "network_upgrade") return "네트워크";
  if (k === "token_migration") return "토큰전환";
  if (k === "security_api") return "보안API";
  return "일반";
}

function noticeTypeLabel(v?: string | null) {
  const k = norm(v);
  if (k === "deposit_withdrawal_suspended") return "입출금 중단";
  if (k === "deposit_suspended") return "입금 중단";
  if (k === "withdrawal_suspended") return "출금 중단";
  if (k === "deposit_withdrawal_resumed") return "입출금 재개";
  if (k === "deposit_resumed") return "입금 재개";
  if (k === "withdrawal_resumed") return "출금 재개";
  if (k === "wallet_maintenance") return "지갑 점검";
  if (k === "listing") return "신규 상장";
  if (k === "delisting") return "상장폐지";
  if (k === "trading_pair_removed") return "거래쌍 제거";
  if (k === "caution_designated") return "거래 유의";
  if (k === "caution_released") return "유의 해제";
  if (k === "futures_margin_update") return "선물마진 변경";
  if (k === "system_maintenance") return "시스템 점검";
  if (k === "hardfork") return "하드포크";
  if (k === "network_upgrade") return "네트워크 업그레이드";
  if (k === "token_migration") return "토큰전환";
  if (k === "security_notice") return "보안 공지";
  if (k === "api_update") return "API 변경";
  return categoryLabel(v);
}

function severityMeta(v?: string | null) {
  const k = norm(v);
  if (k === "critical") {
    return {
      label: "CRITICAL",
      cls: "border-red-400/50 bg-red-500/15 text-red-200",
      desc: "상장폐지, 보안 위험, 자산 손실 가능성처럼 즉시 확인이 필요한 공지입니다.",
    };
  }
  if (k === "high") {
    return {
      label: "HIGH",
      cls: "border-orange-400/45 bg-orange-500/14 text-orange-200",
      desc: "입출금 중단, 거래 유의 등 사용자 행동에 직접 영향이 있을 수 있는 공지입니다.",
    };
  }
  if (k === "medium") {
    return {
      label: "MEDIUM",
      cls: "border-cyan-400/35 bg-cyan-500/10 text-cyan-100",
      desc: "신규 상장, 일반 점검, 선물마진 변경 등 확인 가치가 있는 공지입니다.",
    };
  }
  return {
    label: "LOW",
    cls: "border-white/10 bg-white/[0.05] text-white/55",
    desc: "위험도는 낮지만 기록 가치가 있는 공지입니다.",
  };
}

function formatTime(raw?: string | null) {
  if (!raw) return "원문 확인 필요";
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

function unique(values?: string[] | null) {
  const arr = Array.isArray(values) ? values.filter(Boolean) : [];
  return Array.from(new Set(arr));
}

function cleanExcerpt(input?: string | null) {
  const raw = String(input || "").trim();
  if (!raw) return "";

  const badPatterns = [
    /Buy Crypto/gi,
    /Referral Program/gi,
    /Announcement Stay on top/gi,
    /Latest Activities/gi,
    /Latest Bybit News/gi,
    /roadmap/gi,
    /TradFi/gi,
  ];

  let text = raw;
  for (const p of badPatterns) text = text.replace(p, " ");

  text = text
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((line) => !/^(Spot|Alpha|Earn|Derivatives|New Listings|Delistings|ALL)$/i.test(line))
    .join("\n");

  return text.replace(/\n{3,}/g, "\n\n").trim();
}

function isAbruptSnippet(text: string) {
  const s = text.trim();
  if (!s) return true;

  // Bitget/일부 CEX 상세 HTML에서 meta description만 잡히면 문장이 중간에 끊기는 경우가 있습니다.
  if (/\b(tr|fo|th|fol|following\s+(tr|t)?|the\s+following\s+(tr|t)?)$/i.test(s)) return true;

  // 충분히 긴 문단이 아니면서 문장 종결도 없으면 원문 일부보다는 확인 포인트로 보여주는 편이 낫습니다.
  if (s.length < 220 && !/[.!?。！？)]$/.test(s)) return true;

  return false;
}

function buildFallbackExcerpt(item: NoticeItem, rawSnippet = "") {
  const title = item.title || "해당 공지";
  const exchange = exchangeLabel(item.exchange);
  const category = categoryLabel(item.category);
  const type = noticeTypeLabel(item.notice_type);
  const symbols = unique(item.symbols).join(", ") || "해당 자산";
  const chains = unique(item.chains).join(", ") || "관련 네트워크";

  const lines = [
    `${exchange}의 ${category} 관련 공지입니다.`,
    `공지 제목은 “${title}”이며, 세부 유형은 ${type}으로 분류되어 있습니다.`,
    `관련 코인: ${symbols}. 관련 네트워크: ${chains}.`,
  ];

  if (rawSnippet) {
    lines.push(`수집된 원문 일부: ${rawSnippet}`);
  } else {
    lines.push("거래소 페이지 구조상 원문 본문 자동 추출이 제한된 공지입니다.");
  }

  lines.push("세부 조건, 적용 시간, 실제 입출금/거래 가능 여부는 반드시 원문 보기를 눌러 공식 안내에서 확인하시는 것이 안전합니다.");

  return lines.join("\n");
}

function getDetailBlock(item: NoticeItem) {
  const cleaned = cleanExcerpt(item.detail_excerpt);
  const usableRealExcerpt = item.detail_fetch_status === "ok" && cleaned.length >= 220 && !isAbruptSnippet(cleaned);

  if (usableRealExcerpt) {
    return {
      title: "원문 일부",
      badge: "자동 추출",
      text: cleaned,
      hasRealExcerpt: true,
    };
  }

  return {
    title: "원문 일부 / 확인 포인트",
    badge: "자동 보강",
    text: buildFallbackExcerpt(item, cleaned),
    hasRealExcerpt: false,
  };
}

function Chip({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${className}`}>{children}</span>;
}

function getLocalCainToken() {
  try {
    if (typeof window === "undefined") return "";
    return String(window.localStorage.getItem("cain_token") || "").trim();
  } catch {
    return "";
  }
}

function buildAuthHeaders(): HeadersInit {
  const token = getLocalCainToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function ExchangeNoticeDetailClient({ id }: { id: string }) {
  const [item, setItem] = useState<NoticeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch(`/api/public/exchange-notices/${encodeURIComponent(id)}`, {
          headers: buildAuthHeaders(),
          cache: "no-store",
        });
        const json = (await res.json()) as ApiResponse;

        if (!json.ok) throw new Error(json.error || "fetch_failed");
        if (!mounted) return;
        setItem(json.item);
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message || "unknown_error");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    if (id) run();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <main className="w-full px-3 py-8 md:px-5">
        <div className="mx-auto w-full max-w-[1000px] rounded-2xl border border-white/10 bg-black/40 p-6 text-sm text-white/70">
          거래소 공지를 불러오는 중입니다.
        </div>
      </main>
    );
  }

  if (err || !item) {
    return (
      <main className="w-full px-3 py-8 md:px-5">
        <div className="mx-auto w-full max-w-[1000px] space-y-4">
          <Link href="/exchange-notices" className="text-sm text-[var(--brand)]">
            ← 거래소 공지 목록
          </Link>
          <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-6 text-sm text-red-200">
            거래소 공지 로딩 실패: {err || "not_found"}
          </div>
        </div>
      </main>
    );
  }

  const sev = severityMeta(item.severity);
  const symbols = unique(item.symbols);
  const chains = unique(item.chains);
  const markets = unique(item.markets);
  const noticeTime = item.source_published_at || item.published_at || item.created_at;
  const detailBlock = getDetailBlock(item);

  const aiContext = {
    type: "exchange_notice",
    id: item.id,
    exchange: exchangeLabel(item.exchange),
    title: item.title,
    category: categoryLabel(item.category),
    notice_type: noticeTypeLabel(item.notice_type),
    severity: sev.label,
    symbols,
    chains,
    markets,
    summary_ko: item.summary_ko,
    detail_excerpt: detailBlock.text,
    detail_fetch_status: item.detail_fetch_status,
    notice_time: noticeTime,
    url: item.url,
  };

  return (
    <main className="w-full px-3 py-8 md:px-5">
      <div className="mx-auto w-full max-w-[1000px] space-y-5">
        <Link href="/exchange-notices" className="inline-flex text-sm text-[var(--brand)] hover:underline">
          ← 거래소 공지 목록
        </Link>

        <section className="rounded-3xl border border-white/10 bg-black/40 p-5 md:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <Chip className={`${exchangePillClass(item.exchange)} font-bold tracking-wide`}>
              <ExchangePillLabel exchange={item.exchange} />
            </Chip>
            <Chip className={sev.cls}>{sev.label}</Chip>
            <Chip className="border-white/10 bg-white/[0.05] text-white/65">{categoryLabel(item.category)}</Chip>
            <Chip className="border-white/10 bg-white/[0.05] text-white/65">{noticeTypeLabel(item.notice_type)}</Chip>
            {item.is_important && <Chip className="border-red-400/40 bg-red-500/10 text-red-200">중요</Chip>}
          </div>

          <h1 className="mt-5 break-words text-2xl font-semibold leading-9 text-white md:text-3xl">
            {item.title || "제목 없음"}
          </h1>

          <div className="mt-3 text-sm text-white/45">공지 시간: {formatTime(noticeTime)}</div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[rgba(18,203,255,0.25)] bg-[rgba(18,203,255,0.07)] p-4">
              <div className="text-sm font-semibold text-[var(--brand)]">CAIN 자동 영향 해석</div>
              <p className="mt-3 text-sm leading-7 text-white/75">
                {item.summary_ko ||
                  `${categoryLabel(item.category)} 관련 공지입니다. 관련 코인과 네트워크, 실제 이용 가능 여부는 원문과 거래소 지갑 상태를 함께 확인하는 것이 안전합니다.`}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="text-sm font-semibold text-white">중요도 기준</div>
              <div className="mt-3 text-sm font-semibold text-[var(--brand)]">{sev.label}</div>
              <p className="mt-2 text-sm leading-6 text-white/65">{sev.desc}</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {symbols.length > 0 && (
              <div>
                <div className="mb-2 text-xs text-white/40">관련 코인</div>
                <div className="flex flex-wrap gap-2">
                  {symbols.map((s) => (
                    <Chip key={s} className="border-[rgba(18,203,255,0.22)] bg-[rgba(18,203,255,0.07)] text-[var(--brand)]">
                      {s}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            {chains.length > 0 && (
              <div>
                <div className="mb-2 text-xs text-white/40">관련 네트워크</div>
                <div className="flex flex-wrap gap-2">
                  {chains.map((s) => (
                    <Chip key={s} className="border-white/10 bg-white/[0.04] text-white/55">
                      {s}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-7 rounded-2xl border border-white/10 bg-black/30 p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-white">{detailBlock.title}</div>
              <span
                className={[
                  "rounded-full border px-3 py-1 text-xs",
                  detailBlock.hasRealExcerpt
                    ? "border-[rgba(18,203,255,0.22)] bg-[rgba(18,203,255,0.07)] text-[var(--brand)]"
                    : "border-white/10 bg-white/[0.04] text-white/45",
                ].join(" ")}
              >
                {detailBlock.badge}
              </span>
            </div>
            <div className="mt-4 min-h-[140px] whitespace-pre-line break-words text-sm leading-7 text-white/75">
              {detailBlock.text}
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-2 sm:flex-row">
            <a
              href={item.url || "#"}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-[rgba(18,203,255,0.35)] bg-[rgba(18,203,255,0.08)] px-5 py-2 text-sm text-[var(--brand)] hover:bg-[rgba(18,203,255,0.14)]"
            >
              원문 보기
            </a>
            <Link
              href="/exchange-notices"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-sm text-white/80 hover:bg-white/10"
            >
              목록으로
            </Link>
          </div>
        </section>

        <AiBox
          context={aiContext}
          title="🤖 CAIN AI 분석 (거래소 공지)"
          buttonLabel="AI로 분석하기"
          placeholder="이 공지가 입출금/거래/보유 코인에 미치는 영향과 확인해야 할 리스크를 정리해줘"
          helperText="* 이 공지의 제목, 거래소, 중요도, 관련 코인, 네트워크, 원문 일부만 AI에 전달됩니다."
          defaultPrompt="이 거래소 공지의 핵심 요약 + 사용자에게 미칠 영향 + 입출금/거래 리스크 + 확인해야 할 행동을 한국어로 정리해줘"
          showDebug={false}
        />
      </div>
    </main>
  );
}