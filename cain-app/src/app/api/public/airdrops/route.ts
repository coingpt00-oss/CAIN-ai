// src/app/api/public/airdrops/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export type AirdropItem = {
  id: string;
  created_at: string;
  updated_at: string;
  source: string;
  source_id: string;
  title: string;
  description_short: string | null;
  exchange: string | null;
  chain: string | null;
  link_url: string | null;
  canonical_url: string | null;
  countries: string[] | null;
  kyc_required: boolean | null;
  task_effort_mins: number | null;

  reward_token: string | null;
  reward_usd_lo: number | null;
  reward_usd_hi: number | null;
  reward_hint: string | null;
  reward_detail: string | null;
  claim_eta_days: number | null;

  start_at: string | null;
  end_at: string | null;
  risk_note: string | null;
  is_active: boolean | null;

  grade: string | null;
  has_reward: boolean | null;
  pre_filter: string | null;
  detail_excerpt: string | null;
  last_checked_at: string | null;
  publish_at: string | null;

  eligibility: string | null;
  period_text: string | null;
  summary_ko: string | null;
  participation_steps: string[] | null;
  quality_score: number | null;
};

type Mode = "live" | "notice" | "target" | "ended" | "region" | "all";

type AirdropsResponse =
  | { ok: true; items: AirdropItem[]; mode: Mode; updatedAt: string }
  | {
      ok: false;
      items: [];
      mode: Mode;
      updatedAt: string;
      error: string;
      detail?: any;
    };

const CACHE_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  // VPS cron이 15분 주기이므로, API는 CDN/공유 캐시에 짧게 저장하고 stale-while-revalidate로 호출 안정성을 높입니다.
  "cache-control": "public, s-maxage=120, stale-while-revalidate=900",
};

function j(status: number, body: AirdropsResponse) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: CACHE_HEADERS,
  });
}

function parseCsvList(v: string | null) {
  if (!v) return null;

  const list = v
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  return list.length ? list : null;
}

function validMode(v: string | null): Mode {
  const m = String(v || "live").trim().toLowerCase();

  if (
    m === "live" ||
    m === "notice" ||
    m === "target" ||
    m === "ended" ||
    m === "region" ||
    m === "all"
  ) {
    return m;
  }

  return "live";
}

function isHiddenPreFilter(v: unknown) {
  const pf = String(v || "").trim().toLowerCase();

  return [
    "legacy_worker_disabled",
    "manual_hide",
    "menu_or_junk",
    "low_confidence",
  ].includes(pf);
}

function exposeByMode(row: AirdropItem, mode: Mode) {
  if (isHiddenPreFilter(row.pre_filter)) return false;

  const pf = String(row.pre_filter || "").trim().toLowerCase();

  if (mode === "live") return row.is_active === true && !pf;
  if (mode === "notice") return pf === "distribution_notice";
  if (mode === "target") return pf === "target_check_notice";
  if (mode === "ended") return pf === "expired_or_result_notice";
  if (mode === "region") return pf === "region_restricted_or_unclear";

  return (
    (row.is_active === true && !pf) ||
    pf === "distribution_notice" ||
    pf === "target_check_notice" ||
    pf === "expired_or_result_notice" ||
    pf === "region_restricted_or_unclear"
  );
}

export async function GET(req: NextRequest) {
  const mode = validMode(new URL(req.url).searchParams.get("mode"));

  try {
    const url = new URL(req.url);

    const grades = parseCsvList(url.searchParams.get("grade"));
    const exchanges = parseCsvList(url.searchParams.get("exchange"));
    const source = (url.searchParams.get("source") || "").trim().toLowerCase();

    const limitRaw = url.searchParams.get("limit");
    const limit = Math.min(Math.max(Number(limitRaw || "50") || 50, 1), 200);
    const fetchLimit = Math.min(Math.max(limit * 4, 100), 500);

    let q: any = (supabaseAdmin.from("airdrops") as any)
      .select(
        [
          "id",
          "created_at",
          "updated_at",
          "source",
          "source_id",
          "title",
          "description_short",
          "exchange",
          "chain",
          "link_url",
          "canonical_url",
          "countries",
          "kyc_required",
          "task_effort_mins",
          "reward_token",
          "reward_usd_lo",
          "reward_usd_hi",
          "reward_hint",
          "reward_detail",
          "claim_eta_days",
          "start_at",
          "end_at",
          "risk_note",
          "is_active",
          "grade",
          "has_reward",
          "pre_filter",
          "detail_excerpt",
          "last_checked_at",
          "publish_at",
          "eligibility",
          "period_text",
          "summary_ko",
          "participation_steps",
          "quality_score",
        ].join(",")
      )
      .order("is_active", { ascending: false })
      .order("publish_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(fetchLimit);

    if (source) q = q.eq("source", source);
    if (grades) q = q.in("grade", grades);
    if (exchanges) q = q.in("exchange", exchanges);

    const result = (await q) as {
      data: AirdropItem[] | null;
      error: { message?: string } | null;
    };

    if (result.error) {
      console.error("[airdrops] supabase error:", result.error);

      return j(500, {
        ok: false,
        items: [],
        mode,
        updatedAt: new Date().toISOString(),
        error: "supabase_error",
        detail: result.error,
      });
    }

    const items = (result.data || [])
      .filter((row) => exposeByMode(row, mode))
      .slice(0, limit);

    return j(200, {
      ok: true,
      items,
      mode,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[airdrops] unexpected error:", err);

    return j(500, {
      ok: false,
      items: [],
      mode,
      updatedAt: new Date().toISOString(),
      error: "unexpected_error",
      detail: String(err),
    });
  }
}