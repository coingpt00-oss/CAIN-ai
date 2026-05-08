// src/app/api/public/coin/chart/route.ts
// CAIN — Public Coin Chart API (Supabase Snapshots)
// GET /api/public/coin/chart?id=bitcoin&range=24h&vs=krw

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function json(status: number, body: any) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "s-maxage=30, stale-while-revalidate=30",
    },
  });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const id = url.searchParams.get("id");
  if (!id) {
    return json(400, { ok: false, error: "missing_coin_id" });
  }

  const vs = (url.searchParams.get("vs") || "krw").toLowerCase();
  const rangeParam = (url.searchParams.get("range") || "24h").toLowerCase();

  const allowed = ["24h", "30d", "90d", "1y"];
  const range = (allowed.includes(rangeParam) ? rangeParam : "24h") as
    | "24h"
    | "30d"
    | "90d"
    | "1y";

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON) {
    return json(500, { ok: false, error: "supabase_not_configured" });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

  // 최신 스냅샷 1개만 가져오기 (updated_at 기준)
  const { data, error } = await supabase
    .from("coin_chart_snapshots")
    .select("coin_id, vs, range, points, meta, updated_at")
    .eq("coin_id", id)
    .eq("vs", vs)
    .eq("range", range)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    console.error("chart snapshot error", error);
    return json(404, {
      ok: false,
      error: "not_found",
      message: "no snapshot found",
    });
  }

  return json(200, {
    ok: true,
    id: data.coin_id,
    vs: data.vs,
    range: data.range,
    points: data.points, // [{ t, p }] 리스트
    meta: data.meta,
    updatedAt: data.updated_at,
  });
}
