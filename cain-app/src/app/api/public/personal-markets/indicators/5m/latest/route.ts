import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 보스: env로 설정
const CACHE_WORKER_URL = process.env.CAIN_CACHE_WORKER_URL!;
const CACHE_WORKER_KEY = process.env.CAIN_CACHE_WORKER_KEY!;

// 캐시 키(고정)
const CACHE_KEY = "markets_indicators_5m_latest";
const TTL_SECONDS = 30; // 30초 캐시 (원하면 60도 OK)

async function cacheGet() {
  const r = await fetch(`${CACHE_WORKER_URL}/cache/get?key=${encodeURIComponent(CACHE_KEY)}`, {
    headers: { "x-cain-cache-key": CACHE_WORKER_KEY },
  });
  if (!r.ok) return null;
  const j = await r.json().catch(() => null);
  if (j?.ok && j?.hit) return j.data;
  return null;
}

async function cacheSet(value: any) {
  await fetch(`${CACHE_WORKER_URL}/cache/set`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-cain-cache-key": CACHE_WORKER_KEY,
    },
    body: JSON.stringify({ key: CACHE_KEY, ttl: TTL_SECONDS, value }),
  }).catch(() => {});
}

export async function GET(_req: NextRequest) {
  try {
    // 1) 캐시 히트면 Supabase 안 감
    const hit = await cacheGet();
    if (hit) {
      return NextResponse.json({ ok: true, cached: true, ...hit });
    }

    // 2) 캐시 미스면 Supabase에서 최신 ts 기준으로 가져오기
    // 최신 ts 찾기
    const { data: maxRow, error: maxErr } = await supabaseAdmin
      .from("markets_indicators_5m")
      .select("ts")
      .order("ts", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxErr) throw new Error(maxErr.message);
    if (!maxRow?.ts) {
      const empty = { ts: null, rows: [] };
      await cacheSet(empty);
      return NextResponse.json({ ok: true, cached: false, ...empty });
    }

    const ts = maxRow.ts;

    // 그 ts의 전체 row 가져오기
    const { data: rows, error: rowsErr } = await supabaseAdmin
      .from("markets_indicators_5m")
      .select("*")
      .eq("ts", ts)
      .order("symbol", { ascending: true });

    if (rowsErr) throw new Error(rowsErr.message);

    const payload = { ts, rows: rows || [] };

    // 3) 캐시에 저장
    await cacheSet(payload);

    return NextResponse.json({ ok: true, cached: false, ...payload });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
