// src/app/exchange-notices/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

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
  detail_excerpt: string | null;
  url: string | null;
  category: string | null;
  notice_type: string | null;
  severity: string | null;
  symbols: string[] | null;
  chains: string[] | null;
  markets: string[] | null;
  published_at: string | null;
  source_published_at: string | null;
  modified_at: string | null;
  detail_fetch_status: string | null;
  detail_fetched_at: string | null;
  is_active: boolean | null;
  is_important: boolean | null;
};

type ApiResponse =
  | { ok: true; items: NoticeItem[]; updatedAt: string; page?: { total: number | null } }
  | { ok: false; items?: []; error: string; updatedAt?: string };

type CategoryKey =
  | ""
  | "important"
  | "deposit_withdrawal"
  | "listing"
  | "delisting"
  | "trading_update"
  | "futures_margin"
  | "maintenance"
  | "network_upgrade"
  | "token_migration"
  | "security_api";

type TooltipData = {
  key: string;
  title: string;
  body: string;
  side?: "left" | "right";
};

const CATEGORY_TABS: { key: CategoryKey; label: string; desc: string }[] = [
  { key: "", label: "전체", desc: "8개 거래소의 주요 공지를 한 번에 확인합니다." },
  { key: "important", label: "중요", desc: "상장폐지, 보안, 입출금 중단 등 우선 확인이 필요한 공지입니다." },
  { key: "deposit_withdrawal", label: "입출금", desc: "입금·출금 중단, 재개, 지갑 점검 공지입니다." },
  { key: "listing", label: "상장", desc: "신규 거래지원 및 신규 마켓 공지입니다." },
  { key: "delisting", label: "상장폐지", desc: "거래지원 종료, 거래쌍 제거 등 위험 공지입니다." },
  { key: "trading_update", label: "거래변경", desc: "거래 유의, 호가, 수수료, 정책 변경 공지입니다." },
  { key: "futures_margin", label: "선물마진", desc: "선물, 마진, 펀딩, 레버리지 관련 공지입니다." },
  { key: "maintenance", label: "점검", desc: "시스템 점검, 장애, 서비스 일시 중단 공지입니다." },
  { key: "network_upgrade", label: "네트워크", desc: "하드포크, 네트워크 업그레이드 공지입니다." },
  { key: "token_migration", label: "토큰전환", desc: "스왑, 마이그레이션, 리브랜딩 공지입니다." },
  { key: "security_api", label: "보안API", desc: "보안, 피싱, API, 인증 관련 공지입니다." },
];

const EXCHANGES = [
  { key: "", label: "거래소" },
  { key: "upbit", label: "UPBIT" },
  { key: "bithumb", label: "BITHUMB" },
  { key: "coinone", label: "COINONE" },
  { key: "korbit", label: "KORBIT" },
  { key: "binance", label: "BINANCE" },
  { key: "bybit", label: "BYBIT" },
  { key: "bitget", label: "BITGET" },
  { key: "okx", label: "OKX" },
];

const SEVERITIES = [
  { key: "", label: "중요도" },
  { key: "critical", label: "Critical" },
  { key: "high", label: "High" },
  { key: "medium", label: "Medium" },
  { key: "low", label: "Low" },
];


function hasLocalCainUser() {
  try {
    if (typeof window === "undefined") return false;

    const raw = window.localStorage.getItem("cain_user");
    if (!raw) return false;

    const parsed = JSON.parse(raw);
    return Boolean(parsed?.uid || parsed?.username);
  } catch {
    return false;
  }
}

function LoginRequiredForExchangeNotices() {
  return (
    <main className="w-full px-4 py-10 md:px-8">
      <section className="mx-auto max-w-3xl rounded-3xl border border-[rgba(18,203,255,0.28)] bg-black/45 p-6 md:p-8">
        <div className="inline-flex rounded-full border border-[rgba(18,203,255,0.35)] bg-[rgba(18,203,255,0.08)] px-4 py-1.5 text-sm font-semibold text-[var(--brand)]">
          CAIN PREMIUM
        </div>

        <h1 className="mt-5 text-2xl font-semibold text-white md:text-3xl">
          거래소 공지는 인증 회원 전용입니다.
        </h1>

        <p className="mt-3 text-sm leading-7 text-white/60 md:text-base">
          입출금 중단, 상장, 상장폐지, 점검, 보안 공지는 CAIN 인증 회원에게만 제공됩니다.
          로그인 또는 회원가입 후 이용해주십시오.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login?next=/exchange-notices"
            className="inline-flex items-center justify-center rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-black hover:opacity-90"
          >
            로그인하고 거래소 공지 열기
          </Link>

          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white/80 hover:bg-white/[0.08]"
          >
            회원가입
          </Link>
        </div>
      </section>
    </main>
  );
}

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

function shouldShowNoticeType(category?: string | null, noticeType?: string | null) {
  const c = norm(category);
  const n = norm(noticeType);
  if (!n) return false;
  if (n === c) return false;
  if (noticeTypeLabel(n) === categoryLabel(c)) return false;
  return true;
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
    desc: "입출금 재개나 일반 확인성 공지처럼 위험도는 낮지만 기록 가치가 있는 공지입니다.",
  };
}

function infoForCategory(v?: string | null) {
  const k = norm(v);
  if (k === "deposit_withdrawal") return "입금·출금 중단, 재개, 지갑 점검 등 자산 이동에 관련된 공지입니다.";
  if (k === "listing") return "새로운 코인 또는 마켓이 거래소에 추가되는 공지입니다.";
  if (k === "delisting") return "거래지원 종료 또는 거래쌍 제거처럼 보유자에게 중요한 위험 공지입니다.";
  if (k === "trading_update") return "거래 유의, 호가 단위, 수수료, 거래 조건 변경 관련 공지입니다.";
  if (k === "futures_margin") return "선물, 마진, 펀딩, 레버리지, 계약 변경 관련 공지입니다.";
  if (k === "maintenance") return "시스템 점검, 장애, 서비스 중단 관련 공지입니다.";
  if (k === "network_upgrade") return "하드포크나 네트워크 업그레이드로 입출금에 영향이 있을 수 있는 공지입니다.";
  if (k === "token_migration") return "토큰 스왑, 마이그레이션, 리브랜딩 관련 공지입니다.";
  if (k === "security_api") return "보안, 피싱, API, 인증 관련 공지입니다.";
  return "거래소 공지의 큰 분류입니다.";
}

function formatTime(raw?: string | null) {
  if (!raw) return "거래소 원문 확인 필요";
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

function displayTime(item: NoticeItem) {
  return item.source_published_at || item.published_at || item.created_at || item.updated_at;
}

function chipList(values?: string[] | null, max = 5) {
  const arr = Array.isArray(values) ? values.filter(Boolean) : [];
  return Array.from(new Set(arr)).slice(0, max);
}

function buildUrl({
  category,
  exchange,
  severity,
  q,
}: {
  category: CategoryKey;
  exchange: string;
  severity: string;
  q: string;
}) {
  const params = new URLSearchParams();
  params.set("limit", "120");
  if (category === "important") params.set("important", "1");
  else if (category) params.set("category", category);
  if (exchange) params.set("exchange", exchange);
  if (severity) params.set("severity", severity);
  if (q.trim()) params.set("q", q.trim());
  return `/api/public/exchange-notices?${params.toString()}`;
}

function cleanExcerpt(raw?: string | null) {
  const text = String(raw || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^(Buy Crypto|Spot|Alpha|TradFi|Referral Program|roadmap|ALL|New Listings|Delistings|Latest Activities|Earn|Latest Bybit News)$/i.test(line))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text || text.length < 80) return "";
  return text;
}

function TooltipChip({
  tooltip,
  activeKey,
  hoverKey,
  setActiveKey,
  setHoverKey,
  children,
  className,
}: {
  tooltip: TooltipData;
  activeKey: string | null;
  hoverKey: string | null;
  setActiveKey: (v: string | null) => void;
  setHoverKey: (v: string | null) => void;
  children: React.ReactNode;
  className: string;
}) {
  const open = activeKey === tooltip.key || hoverKey === tooltip.key;

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setHoverKey(tooltip.key)}
      onMouseLeave={() => setHoverKey(null)}
      onClick={(e) => {
        e.stopPropagation();
        setActiveKey(activeKey === tooltip.key ? null : tooltip.key);
      }}
    >
      <button type="button" className={`rounded-full border px-3 py-1 text-xs font-semibold ${className}`}>
        {children}
      </button>
      {open ? (
        <span
          className={`absolute top-8 z-40 w-72 rounded-xl border border-[color:rgba(0,229,255,0.25)] bg-[#071015] p-3 text-left shadow-[0_10px_30px_rgba(0,0,0,0.55)] ${
            tooltip.side === "right" ? "right-0" : "left-0"
          }`}
        >
          <span className="block text-xs font-semibold text-[var(--brand)]">{tooltip.title}</span>
          <span className="mt-1 block whitespace-pre-line text-[11px] leading-5 text-white/80">
            {tooltip.body}
          </span>
        </span>
      ) : null}
    </span>
  );
}

export default function ExchangeNoticesPage() {
  const router = useRouter();
  const [items, setItems] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryKey>("");
  const [exchange, setExchange] = useState("");
  const [severity, setSeverity] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [activeTooltipKey, setActiveTooltipKey] = useState<string | null>(null);
  const [hoverTooltipKey, setHoverTooltipKey] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  const activeTab = useMemo(() => {
    return CATEGORY_TABS.find((x) => x.key === category) || CATEGORY_TABS[0];
  }, [category]);

  useEffect(() => {
    setIsAuthed(hasLocalCainUser());
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    const close = () => {
      setActiveTooltipKey(null);
      setHoverTooltipKey(null);
    };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  useEffect(() => {
    if (!authChecked || !isAuthed) return;

    let mounted = true;

    async function run() {
      try {
        setLoading(true);
        setErr(null);
        const res = await fetch(buildUrl({ category, exchange, severity, q }));
        const json = (await res.json()) as ApiResponse;
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
  }, [authChecked, isAuthed, category, exchange, severity, q]);

  if (!authChecked) {
    return (
      <main className="w-full px-4 py-10 md:px-8">
        <section className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-black/45 p-6 text-sm text-white/60">
          거래소 공지 접근 권한을 확인하는 중입니다.
        </section>
      </main>
    );
  }

  if (!isAuthed) {
    return <LoginRequiredForExchangeNotices />;
  }

  return (
    <main className="w-full px-3 py-8 md:px-5">
      <div className="mx-auto w-full max-w-[1200px] space-y-5">
        <section className="space-y-2">
          <h1 className="text-2xl font-semibold text-[var(--brand)] md:text-3xl">거래소 공지</h1>
          <p className="max-w-3xl text-sm leading-6 text-white/60">
            거래소들의 입출금, 상장, 상장폐지, 점검, 선물마진, 보안 공지를 자동 수집해 보여드립니다.
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATEGORY_TABS.map((tab) => {
              const active = category === tab.key;
              return (
                <button
                  key={tab.key || "all"}
                  onClick={() => setCategory(tab.key)}
                  className={[
                    "shrink-0 rounded-full border px-4 py-2 text-sm transition",
                    active
                      ? "border-[var(--brand)] bg-[rgba(18,203,255,0.12)] text-[var(--brand)]"
                      : "border-white/10 bg-black/40 text-white/60 hover:border-white/25 hover:text-white",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
            <div className="text-sm font-medium text-white">{activeTab.label}</div>
            <p className="mt-1 text-sm text-white/50">{activeTab.desc}</p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 rounded-3xl border border-white/10 bg-black/35 p-4 md:grid-cols-[minmax(0,1fr)_160px_160px]">
          <div className="flex min-w-0 items-center gap-2">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setQ(searchInput);
              }}
              placeholder="심볼/공지 검색 예: BTC, 입출금, 상장폐지"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/50 px-4 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-[var(--brand)]/60"
            />
            <button
              onClick={() => setQ(searchInput)}
              className="shrink-0 rounded-xl border border-[rgba(18,203,255,0.35)] bg-[rgba(18,203,255,0.08)] px-5 py-2 text-sm text-[var(--brand)] hover:bg-[rgba(18,203,255,0.14)]"
            >
              검색
            </button>
          </div>
          <select
            value={exchange}
            onChange={(e) => setExchange(e.target.value)}
            className="rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white/80 outline-none"
          >
            {EXCHANGES.map((x) => (
              <option key={x.key || "all"} value={x.key}>
                {x.label}
              </option>
            ))}
          </select>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white/80 outline-none"
          >
            {SEVERITIES.map((x) => (
              <option key={x.key || "all"} value={x.key}>
                {x.label}
              </option>
            ))}
          </select>
        </section>

        {loading && (
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-sm text-white/70">
            거래소 공지를 불러오는 중입니다.
          </div>
        )}

        {!loading && err && (
          <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-6 text-sm text-red-200">
            거래소 공지 로딩 실패: {err}
          </div>
        )}

        {!loading && !err && items.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-sm text-white/70">
            표시할 거래소 공지가 없습니다.
          </div>
        )}

        {!loading && !err && items.length > 0 && (
          <div className="grid grid-cols-1 gap-4">
            {items.map((it) => {
              const sev = severityMeta(it.severity);
              const symbols = chipList(it.symbols, 6);
              const chains = chipList(it.chains, 4);
              const detailHref = `/exchange-notices/${it.id}`;
              const excerpt = cleanExcerpt(it.detail_excerpt);
              const showType = shouldShowNoticeType(it.category, it.notice_type);

              return (
                <article
                  key={it.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(detailHref)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") router.push(detailHref);
                  }}
                  className="cursor-pointer rounded-2xl border border-white/10 bg-black/40 p-5 transition hover:border-[var(--brand)]/60 hover:bg-white/[0.03]"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <TooltipChip
                          tooltip={{ key: `${it.id}-exchange`, title: "거래소", body: `${exchangeLabel(it.exchange)}에서 가져온 공식 공지입니다.` }}
                          activeKey={activeTooltipKey}
                          hoverKey={hoverTooltipKey}
                          setActiveKey={setActiveTooltipKey}
                          setHoverKey={setHoverTooltipKey}
                          className={`${exchangePillClass(it.exchange)} font-bold tracking-wide`}
                        >
                          <ExchangePillLabel exchange={it.exchange} />
                        </TooltipChip>

                        <TooltipChip
                          tooltip={{ key: `${it.id}-severity`, title: "중요도", body: sev.desc }}
                          activeKey={activeTooltipKey}
                          hoverKey={hoverTooltipKey}
                          setActiveKey={setActiveTooltipKey}
                          setHoverKey={setHoverTooltipKey}
                          className={sev.cls}
                        >
                          {sev.label}
                        </TooltipChip>

                        <TooltipChip
                          tooltip={{ key: `${it.id}-category`, title: "카테고리", body: infoForCategory(it.category) }}
                          activeKey={activeTooltipKey}
                          hoverKey={hoverTooltipKey}
                          setActiveKey={setActiveTooltipKey}
                          setHoverKey={setHoverTooltipKey}
                          className="border-white/10 bg-white/[0.05] text-white/65"
                        >
                          {categoryLabel(it.category)}
                        </TooltipChip>

                        {showType && (
                          <TooltipChip
                            tooltip={{ key: `${it.id}-type`, title: "세부 유형", body: `${noticeTypeLabel(it.notice_type)} 유형으로 자동 분류된 공지입니다.` }}
                            activeKey={activeTooltipKey}
                            hoverKey={hoverTooltipKey}
                            setActiveKey={setActiveTooltipKey}
                            setHoverKey={setHoverTooltipKey}
                            className="border-white/10 bg-white/[0.05] text-white/65"
                          >
                            {noticeTypeLabel(it.notice_type)}
                          </TooltipChip>
                        )}

                        {it.is_important && (
                          <TooltipChip
                            tooltip={{
                              key: `${it.id}-important`,
                              title: "중요 공지",
                              body: "CAIN이 우선 확인 대상으로 분류한 공지입니다. 상장폐지, 보안, 입출금 중단, 거래 유의 등이 포함될 수 있습니다.",
                            }}
                            activeKey={activeTooltipKey}
                            hoverKey={hoverTooltipKey}
                            setActiveKey={setActiveTooltipKey}
                            setHoverKey={setHoverTooltipKey}
                            className="border-red-400/40 bg-red-500/10 text-red-200"
                          >
                            중요
                          </TooltipChip>
                        )}
                      </div>

                      <h2 className="break-words text-base font-semibold leading-7 text-white md:text-lg">
                        {it.title || "제목 없음"}
                      </h2>

                      {excerpt && <p className="line-clamp-2 text-sm leading-6 text-white/55">{excerpt}</p>}

                      <div className="flex flex-wrap gap-2">
                        {symbols.map((s) => (
                          <TooltipChip
                            key={`sym-${it.id}-${s}`}
                            tooltip={{ key: `${it.id}-sym-${s}`, title: "관련 코인", body: `관련 코인 또는 심볼: ${s}` }}
                            activeKey={activeTooltipKey}
                            hoverKey={hoverTooltipKey}
                            setActiveKey={setActiveTooltipKey}
                            setHoverKey={setHoverTooltipKey}
                            className="border-[rgba(18,203,255,0.22)] bg-[rgba(18,203,255,0.07)] text-[var(--brand)]"
                          >
                            {s}
                          </TooltipChip>
                        ))}
                        {chains.map((s) => (
                          <TooltipChip
                            key={`chain-${it.id}-${s}`}
                            tooltip={{ key: `${it.id}-chain-${s}`, title: "관련 네트워크", body: `관련 네트워크 또는 체인: ${s}` }}
                            activeKey={activeTooltipKey}
                            hoverKey={hoverTooltipKey}
                            setActiveKey={setActiveTooltipKey}
                            setHoverKey={setHoverTooltipKey}
                            className="border-white/10 bg-white/[0.04] text-white/55"
                          >
                            {s}
                          </TooltipChip>
                        ))}
                      </div>

                      <div className="text-xs text-white/40">공지 시간: {formatTime(displayTime(it))}</div>
                    </div>

                    <div className="flex shrink-0 flex-col gap-2 md:w-44">
                      <a
                        href={it.url || "#"}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center justify-center rounded-full border border-[rgba(18,203,255,0.35)] bg-[rgba(18,203,255,0.08)] px-4 py-2 text-sm text-[var(--brand)] hover:bg-[rgba(18,203,255,0.14)]"
                      >
                        원문 보기
                      </a>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(detailHref);
                        }}
                        className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/80 hover:bg-white/10"
                      >
                        상세 보기
                      </button>
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