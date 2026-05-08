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
  countries: string[] | null;
  kyc_required: boolean | null;
  task_effort_mins: number | null;

  reward_token: string | null;
  reward_usd_lo: number | null;
  reward_usd_hi: number | null;
  claim_eta_days: number | null;

  start_at: string | null;
  end_at: string | null;
  risk_note: string | null;
  is_active: boolean | null;

  grade: string | null; // "A" | "B" | "C" | null
  has_reward: boolean | null;
  pre_filter: string | null;
  detail_excerpt: string | null;
  last_checked_at: string | null;

  publish_at: string | null;
};

type AirdropsResponse =
  | { ok: true; items: AirdropItem[]; updatedAt: string }
  | { ok: false; items: []; updatedAt: string; error: string; detail?: any };

function j(status: number, body: any) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
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

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    // 예: /api/public/airdrops?grade=A,B&exchange=binance,okx&limit=50&has_reward=true
    const grades = parseCsvList(url.searchParams.get("grade"));
    const exchanges = parseCsvList(url.searchParams.get("exchange"));

    const limitRaw = url.searchParams.get("limit");
    const limit = Math.min(Math.max(Number(limitRaw || "50") || 50, 1), 200);

    const hasRewardRaw = url.searchParams.get("has_reward"); // "true" | "false" | null
    const hasReward =
      hasRewardRaw === "true" ? true : hasRewardRaw === "false" ? false : null;

    let q = supabaseAdmin
      // ✅ 핵심: airdrops 테이블이 아니라 View를 읽음
      .from("airdrops_public")
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
          "countries",
          "kyc_required",
          "task_effort_mins",
          "reward_token",
          "reward_usd_lo",
          "reward_usd_hi",
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
        ].join(",")
      );

    // View에서 이미 필터링해도, 쿼리 파라미터는 추가로 적용 가능
    if (grades) q = q.in("grade", grades);
    if (exchanges) q = q.in("exchange", exchanges);
    if (hasReward !== null) q = q.eq("has_reward", hasReward);

    // publish_at 우선, 없으면 created_at
    q = q.order("publish_at", { ascending: false, nullsFirst: false });
    q = q.order("created_at", { ascending: false });

    const { data, error } = await q.limit(limit).returns<AirdropItem[]>();

    if (error) {
      console.error("[airdrops] supabase error:", error);
      return j(500, {
        ok: false,
        items: [],
        updatedAt: new Date().toISOString(),
        error: "supabase_error",
        detail: error,
      } satisfies AirdropsResponse);
    }

    return j(200, {
      ok: true,
      items: data ?? [],
      updatedAt: new Date().toISOString(),
    } satisfies AirdropsResponse);
  } catch (err) {
    console.error("[airdrops] unexpected error:", err);
    return j(500, {
      ok: false,
      items: [],
      updatedAt: new Date().toISOString(),
      error: "unexpected_error",
      detail: String(err),
    } satisfies AirdropsResponse);
  }
}
