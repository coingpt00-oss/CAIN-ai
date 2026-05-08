// src/app/api/public/personal-markets/state-summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

type StateRow = {
  symbol: string | null;
  current_state: string | null;
  state_since: string | null;
  last_changed_at: string | null;
  last_updated_at: string | null;
};

type SnapshotLiteRow = {
  symbol: string | null;
  ts: string | null;
  kimchi_premium: number | null;
  volatility_ratio: number | null;
  volatility_warn: boolean | number | null;
  dispersion_krw: number | null;
  delay_proxy: number | null;
  score: number | null;
  futures_basis_pct: number | null;
};

const DEFAULT_CDN_CACHE = "public, s-maxage=30, stale-while-revalidate=120";
const BROWSER_CACHE = "public, max-age=0, must-revalidate";

function j(
  status: number,
  body: any,
  cacheControl?: string,
  extraHeaders?: Record<string, string>
) {
  const rawCacheControl = cacheControl || DEFAULT_CDN_CACHE;
  const isNoStore = rawCacheControl.includes("no-store");
  const cdnCacheControl = rawCacheControl.startsWith("public")
    ? rawCacheControl
    : `public, ${rawCacheControl}`;

  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "Cache-Control": isNoStore ? "no-store" : BROWSER_CACHE,
      ...(isNoStore
        ? {}
        : {
            "CDN-Cache-Control": cdnCacheControl,
            "Vercel-CDN-Cache-Control": cdnCacheControl,
          }),
      ...(extraHeaders || {}),
    },
  });
}

function normalizeBaseSymbol(raw: string | null): string {
  const s = String(raw || "").trim().toUpperCase();
  if (!s) return "";

  if (s.endsWith("USDT")) return s.slice(0, -4);
  if (s.endsWith("USD")) return s.slice(0, -3);
  if (s.endsWith("KRW")) return s.slice(0, -3);

  return s;
}

function normalizeCanonicalSymbol(base: string): string {
  return `${base}USDT`;
}

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function boolishToBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n !== 0 : false;
}

function hoursBetween(fromIso: string | null, toIso?: string | null): number {
  if (!fromIso) return 0;
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso || new Date().toISOString()).getTime();

  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return 0;

  return Number((to - from) / (1000 * 60 * 60));
}

function calcDaysFromFirstTs(firstTs: string | null): number {
  if (!firstTs) return 0;
  const first = new Date(firstTs).getTime();
  if (!Number.isFinite(first)) return 0;

  const diffMs = Math.max(0, Date.now() - first);
  return Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
}

function durationConfidence(hours: number) {
  if (hours >= 72) {
    return {
      label: "높음",
      score: 3,
      note: "현재 상태가 비교적 오래 유지된 구간입니다.",
    };
  }

  if (hours >= 24) {
    return {
      label: "보통",
      score: 2,
      note: "현재 상태가 하루 이상 유지되어 참고 가치가 있습니다.",
    };
  }

  if (hours > 0) {
    return {
      label: "낮음",
      score: 1,
      note: "상태가 최근에 시작된 구간이라 해석에 신중함이 필요합니다.",
    };
  }

  return {
    label: "-",
    score: 0,
    note: "지속시간 데이터를 계산할 수 없습니다.",
  };
}

function deriveChangeEvent(row: SnapshotLiteRow | null): string {
  if (!row) return "변화 이벤트: 데이터 없음";

  const k = Math.abs(toNumberOrNull(row.kimchi_premium) || 0);
  const v = toNumberOrNull(row.volatility_ratio) || 0;
  const d = toNumberOrNull(row.dispersion_krw) || 0;
  const warn = boolishToBool(row.volatility_warn);

  if (k >= 12) return "변화 이벤트: 김프 극단 구간";
  if (k >= 8) return "변화 이벤트: 김프 확대 구간";
  if (warn) return "변화 이벤트: 변동성 경고 플래그";
  if (v >= 0.02) return "변화 이벤트: 단기 변동 비율 상승";
  if (d >= 1_500_000) return "변화 이벤트: 거래소 간 분산 확대";

  return "변화 이벤트: 뚜렷한 이상 없음";
}

async function fetchLatestState(
  supabase: any,
  candidates: string[]
): Promise<StateRow | null> {
  const { data, error } = await supabase
    .from("pm_state")
    .select("symbol,current_state,state_since,last_changed_at,last_updated_at")
    .in("symbol", candidates)
    .order("last_updated_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`pm_state query failed: ${error.message}`);
  }

  const row = (data ?? [])[0] as any;
  if (!row) return null;

  return {
    symbol: row.symbol ?? null,
    current_state: row.current_state ?? null,
    state_since: row.state_since ?? null,
    last_changed_at: row.last_changed_at ?? null,
    last_updated_at: row.last_updated_at ?? null,
  };
}

async function fetchOldestSnapshotTs(
  supabase: any,
  candidates: string[]
): Promise<string | null> {
  const { data, error } = await supabase
    .from("pm_snapshots_3m")
    .select("ts")
    .in("symbol", candidates)
    .order("ts", { ascending: true })
    .limit(1);

  if (error) {
    throw new Error(`pm_snapshots_3m oldest query failed: ${error.message}`);
  }

  const row = (data ?? [])[0] as any;
  return row?.ts ? String(row.ts) : null;
}

async function fetchLatestSnapshot(
  supabase: any,
  candidates: string[]
): Promise<SnapshotLiteRow | null> {
  const { data, error } = await supabase
    .from("pm_snapshots_3m")
    .select(
      "symbol,ts,kimchi_premium,volatility_ratio,volatility_warn,dispersion_krw,delay_proxy,score,futures_basis_pct"
    )
    .in("symbol", candidates)
    .order("ts", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`pm_snapshots_3m latest query failed: ${error.message}`);
  }

  const row = (data ?? [])[0] as any;
  if (!row) return null;

  return {
    symbol: row.symbol ?? null,
    ts: row.ts ?? null,
    kimchi_premium: toNumberOrNull(row.kimchi_premium),
    volatility_ratio: toNumberOrNull(row.volatility_ratio),
    volatility_warn:
      typeof row.volatility_warn === "boolean"
        ? row.volatility_warn
        : row.volatility_warn == null
        ? null
        : Number(row.volatility_warn),
    dispersion_krw: toNumberOrNull(row.dispersion_krw),
    delay_proxy: toNumberOrNull(row.delay_proxy),
    score: toNumberOrNull(row.score),
    futures_basis_pct: toNumberOrNull(row.futures_basis_pct),
  };
}

async function fetchCountSince(
  supabase: any,
  candidates: string[],
  sinceIso: string
): Promise<number> {
  const { count, error } = await supabase
    .from("pm_snapshots_3m")
    .select("ts", { count: "exact", head: true })
    .in("symbol", candidates)
    .gte("ts", sinceIso);

  if (error) {
    throw new Error(`pm_snapshots_3m count query failed: ${error.message}`);
  }

  return Number(count || 0);
}

export async function GET(req: NextRequest) {
  try {
    if (!SUPABASE_URL) {
      return j(
        500,
        {
          ok: false,
          error: "missing_env",
          detail: "SUPABASE_URL is not set",
        },
        "no-store"
      );
    }

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return j(
        500,
        {
          ok: false,
          error: "missing_env",
          detail: "SUPABASE_SERVICE_ROLE_KEY is not set",
        },
        "no-store"
      );
    }

    const url = new URL(req.url);
    const rawSymbol = url.searchParams.get("symbol");
    const nocache = url.searchParams.get("nocache") === "1";

    const symbolBase = normalizeBaseSymbol(rawSymbol);
    if (!symbolBase) {
      return j(400, { ok: false, error: "missing_symbol" }, "no-store");
    }

    const canonicalSymbol = normalizeCanonicalSymbol(symbolBase);
    const candidates = Array.from(new Set([symbolBase, canonicalSymbol]));

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const now = new Date();
    const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const since30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [latestState, oldestSnapshotTs, latestSnapshot, points7d, points30d] =
      await Promise.all([
        fetchLatestState(supabase, candidates),
        fetchOldestSnapshotTs(supabase, candidates),
        fetchLatestSnapshot(supabase, candidates),
        fetchCountSince(supabase, candidates, since7d),
        fetchCountSince(supabase, candidates, since30d),
      ]);

    const historyDays = calcDaysFromFirstTs(oldestSnapshotTs);
    const durationHours = hoursBetween(
      latestState?.state_since || latestState?.last_changed_at || null
    );
    const durationDays = Number((durationHours / 24).toFixed(2));
    const confidence = durationConfidence(durationHours);
    const changeEvent = deriveChangeEvent(latestSnapshot);

    const similarityReady = historyDays >= 30;
    const durationReady = historyDays >= 7;

    return j(
      200,
      {
        ok: true,
        symbol: symbolBase,
        canonicalSymbol,
        currentState: latestState?.current_state || null,
        stateSince: latestState?.state_since || null,
        lastChangedAt: latestState?.last_changed_at || null,
        lastUpdatedAt: latestState?.last_updated_at || null,

        durationHours: Number(durationHours.toFixed(2)),
        durationDays,

        historyDays,
        firstTs: oldestSnapshotTs,
        latestSnapshotTs: latestSnapshot?.ts || null,

        recentPoints: {
          "7d": points7d,
          "30d": points30d,
        },

        confidence: {
          label: confidence.label,
          score: confidence.score,
          note: confidence.note,
        },

        changeEvent,

        latestMetrics: latestSnapshot
          ? {
              kimchiPremium: latestSnapshot.kimchi_premium,
              volatilityRatio: latestSnapshot.volatility_ratio,
              volatilityWarn: boolishToBool(latestSnapshot.volatility_warn),
              dispersionKrw: latestSnapshot.dispersion_krw,
              delayProxy: latestSnapshot.delay_proxy,
              score: latestSnapshot.score,
              futuresBasisPct: latestSnapshot.futures_basis_pct,
            }
          : null,

        readiness: {
          durationReady,
          similarityReady,
          betaDuration: historyDays > 0 && historyDays < 7,
          betaSimilarity: historyDays > 0 && historyDays < 30,
        },

        meta: {
          source: "supabase",
          stateTable: "pm_state",
          snapshotsTable: "pm_snapshots_3m",
          bucket: "3m",
        },

        _cache: nocache ? "bypass" : "cdn",
      },
      nocache ? "no-store" : "s-maxage=30, stale-while-revalidate=120",
      {
        "X-Cain-Upstream": "supabase-direct",
        "X-Cain-Cache": nocache ? "bypass" : "cdn",
      }
    );
  } catch (e: any) {
    return j(
      500,
      {
        ok: false,
        error: "unexpected",
        detail: String(e?.message || e),
      },
      "no-store",
      { "X-Cain-Upstream": "exception" }
    );
  }
}