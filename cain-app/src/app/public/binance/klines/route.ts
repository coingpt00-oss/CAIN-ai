// src/app/api/public/binance/klines/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const symbol = searchParams.get("symbol");
  const interval = searchParams.get("interval") || "1h";
  const startTime = searchParams.get("startTime");
  const endTime = searchParams.get("endTime");
  const limit = searchParams.get("limit") || "500";

  if (!symbol) {
    return NextResponse.json({ ok: false, error: "symbol required" }, { status: 400 });
  }

  const url = new URL("https://api.binance.com/api/v3/klines");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", interval);
  url.searchParams.set("limit", limit);
  if (startTime) url.searchParams.set("startTime", startTime);
  if (endTime) url.searchParams.set("endTime", endTime);

  try {
    const r = await fetch(url.toString(), { cache: "no-store" });
    if (!r.ok) {
      const t = await r.text();
      return NextResponse.json({ ok: false, error: t }, { status: r.status });
    }
    const data = await r.json();
    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "fetch failed" }, { status: 500 });
  }
}
