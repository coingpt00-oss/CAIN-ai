// src/app/api/public/coin/[id]/route.ts
// CAIN — Public Coin Chart API (Next.js)
// GET /api/public/coin/[id]?range=24h&vs=krw

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const TTL = 180;

function json(status: number, body: any): NextResponse {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // ✅ 워커 TTL(180)과 동기화 (차트도 1~3분이면 충분)
      "cache-control": `public, s-maxage=${TTL}, stale-while-revalidate=${TTL}`,
    },
  });
}

// ✅ Next 16 템플릿에 맞는 시그니처
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await context.params;
  if (!id) return json(400, { ok: false, error: "missing_coin_id" });

  const url = new URL(req.url);
  const vs = (url.searchParams.get("vs") || "krw").toLowerCase();
  const range = (url.searchParams.get("range") || "24h").toLowerCase();

  const allowed = ["24h", "30d", "90d", "1y"];
  if (!allowed.includes(range)) {
    return json(400, { ok: false, error: "invalid_range" });
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON) {
    return json(500, { ok: false, error: "supabase_not_configured" });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

  const { data, error } = await supabase
    .from("coin_chart_snapshots")
    .select("*")
    .eq("coin_id", id)
    .eq("range", range)
    .eq("vs", vs)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return json(404, {
      ok: false,
      error: "not_found",
      message: "no snapshot found",
    });
  }

  return json(200, {
    ok: true,
    id,
    range,
    vs,
    points: data.points,
    meta: data.meta,
    updatedAt: data.created_at,
  });
}
