// src/app/events/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
};

function fmtDate(s?: string | null) {
  if (!s) return "-";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString("ko-KR", { hour12: false });
}

function badgeClass(source?: string | null) {
  const v = (source || "").toLowerCase();
  if (v === "upbit")
    return "bg-[rgba(18,203,255,0.15)] text-[var(--brand)] border border-[rgba(18,203,255,0.25)]";
  if (v === "bithumb") return "bg-white/10 text-white/80 border border-white/15";
  if (v === "binance")
    return "bg-yellow-500/15 text-yellow-300 border border-yellow-500/25";
  if (v === "bybit") return "bg-red-500/15 text-red-300 border border-red-500/25";
  if (v === "okx") return "bg-white/10 text-white border border-white/15";
  if (v === "bitget")
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25";
  return "bg-white/10 text-white/80 border border-white/15";
}

function labelSource(source?: string | null) {
  const v = (source || "").toLowerCase();
  if (!v) return "UNKNOWN";
  return v.toUpperCase();
}

export default function EventsPage() {
  const [items, setItems] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>("");

  const filtered = useMemo(() => {
    if (!sourceFilter) return items;
    return items.filter((x) => (x.source || "").toLowerCase() === sourceFilter);
  }, [items, sourceFilter]);

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch("/api/public/events?limit=100", {
          cache: "no-store",
        });
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
  }, []);

  return (
    <main className="w-full px-3 md:px-5 py-8">
      <div className="mx-auto w-full max-w-[1200px] space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--brand)]">이벤트</h1>
            <p className="mt-2 text-sm text-white/60">
              CAIN 제휴 거래소 및 파트너 이벤트 안내입니다. (상장/보상/공지 포함)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white/80 outline-none"
            >
              <option value="">전체</option>
              <option value="upbit">업비트</option>
              <option value="bithumb">빗썸</option>
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

        {/* 상태 */}
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
            아직 표시할 이벤트가 없습니다. (수집 중이거나 필터 조건에 걸렸을 수 있습니다.)
          </div>
        )}

        {/* 리스트 */}
        {!loading && !err && filtered.length > 0 && (
          <div className="grid grid-cols-1 gap-4">
            {filtered.map((it) => {
              const when = fmtDate(it.published_at || it.created_at);
              return (
                <div key={it.id} className="rounded-2xl border border-white/10 bg-black/40 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(
                          it.source
                        )}`}
                      >
                        {labelSource(it.source)}
                      </span>

                      {Array.isArray(it.categories) && it.categories.length > 0 && (
                        <span className="text-xs text-white/50">
                          {it.categories.slice(0, 3).join(" · ")}
                        </span>
                      )}
                    </div>

                    <span className="text-xs text-white/45">{when}</span>
                  </div>

                  <div className="mt-3">
                    <div className="text-base font-semibold text-white">
                      {it.title || "(제목 없음)"}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
                    <a
                      href={it.url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-full border border-[rgba(18,203,255,0.35)] bg-[rgba(18,203,255,0.08)] px-4 py-2 text-sm text-[var(--brand)] hover:bg-[rgba(18,203,255,0.14)]"
                    >
                      거래소 공지 보기
                    </a>

                    <Link
                      href={`/events/${it.id}`}
                      className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
                    >
                      상세 보기
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
