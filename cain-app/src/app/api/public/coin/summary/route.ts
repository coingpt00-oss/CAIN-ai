// src/app/api/public/coin/summary/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SB_URL = process.env.SUPABASE_URL;
const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function sbHeaders() {
  if (!SB_URL || !SB_SERVICE_KEY) return null;
  return {
    apikey: SB_SERVICE_KEY,
    Authorization: `Bearer ${SB_SERVICE_KEY}`,
    "Content-Type": "application/json",
  };
}

// GET /api/public/coin/summary?id=bitcoin&vs=krw|usd
export async function GET(req: NextRequest) {
  const headers = sbHeaders();
  if (!headers) {
    return NextResponse.json(
      { ok: false, error: "supabase_env_missing" },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const vsParam = (searchParams.get("vs") || "usd").toLowerCase();
  const vs = vsParam === "krw" ? "krw" : "usd";

  if (!id) {
    return NextResponse.json(
      { ok: false, error: "missing_id" },
      { status: 400 },
    );
  }

  try {
    const url =
      `${SB_URL}/rest/v1/coin_detail_snapshots` +
      `?coin_id=eq.${encodeURIComponent(id)}` +
      `&vs=eq.${vs}` +
      `&order=taken_at.desc&limit=1`;

    const res = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[coin_detail_snapshots] error", res.status, text);
      return NextResponse.json(
        { ok: false, error: "supabase_error" },
        { status: 500 },
      );
    }

    const rows = (await res.json()) as any[];
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { ok: false, error: "no_snapshot" },
        { status: 404 },
      );
    }

    const row = rows[0];
    const payload = row.payload || null;

    // CoinPage에서 기대하는 형태: { ok, data }
    return NextResponse.json(
      {
        ok: true,
        data: payload,
      },
      {
        status: 200,
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch (e: any) {
    console.error("[coin_summary] exception", e?.message || e);
    return NextResponse.json(
      { ok: false, error: "exception" },
      { status: 500 },
    );
  }
}
