// src/app/api/public/personal-markets/indicators/5m/latest/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 보스: env로 설정
const CACHE_WORKER_URL = process.env.CAIN_CACHE_WORKER_URL!;
const CACHE_WORKER_KEY = process.env.CAIN_CACHE_WORKER_KEY!;

// 캐시 키(고정)
const CACHE_KEY = "markets_indicators_5m_latest";
const TTL_SECONDS = 30; // Cache Worker 30초 캐시

// Vercel CDN 캐시: 함수 호출 자체를 줄이기 위한 2차 방어
const BROWSER_CACHE = "public, max-age=0, must-revalidate";
const CDN_CACHE = "public, s-maxage=30, stale-while-revalidate=90";

function cachedJson(status: number, body: any, extraHeaders?: Record<string, string>) {
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": BROWSER_CACHE,
      "cdn-cache-control": CDN_CACHE,
      "vercel-cdn-cache-control": CDN_CACHE,
      ...(extraHeaders || {}),
    },
  });
}

function noStoreJson(status: number, body: any, extraHeaders?: Record<string, string>) {
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      ...(extraHeaders || {}),
    },
  });
}

async function cacheGet() {
  const r = await fetch(`${CACHE_WORKER_URL}/cache/get?key=${encodeURIComponent(CACHE_KEY)}`, {
    cache: "no-store",
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
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      "x-cain-cache-key": CACHE_WORKER_KEY,
    },
    body: JSON.stringify({ key: CACHE_KEY, ttl: TTL_SECONDS, value }),
  }).catch(() => {});
}

export async function GET(_req: NextRequest) {
  try {
    // 1) Cache Worker 히트면 Supabase 안 감
    const hit = await cacheGet();
    if (hit) {
      return cachedJson(
        200,
        { ok: true, cached: true, ...hit },
        {
          "x-cain-cache": "worker-hit, cdn",
          "x-cain-upstream": "cache-worker",
        }
      );
    }

    // 2) Cache Worker 미스면 Supabase에서 최신 ts 기준으로 가져오기
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
      return cachedJson(
        200,
        { ok: true, cached: false, ...empty },
        {
          "x-cain-cache": "worker-miss, cdn",
          "x-cain-upstream": "supabase",
        }
      );
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

    // 3) Cache Worker에 저장
    await cacheSet(payload);

    return cachedJson(
      200,
      { ok: true, cached: false, ...payload },
      {
        "x-cain-cache": "worker-miss, cdn",
        "x-cain-upstream": "supabase",
      }
    );
  } catch (e: any) {
    return noStoreJson(
      500,
      { ok: false, error: String(e?.message || e) },
      { "x-cain-upstream": "exception" }
    );
  }
}