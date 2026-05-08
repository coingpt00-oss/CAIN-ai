// src/app/api/public/personal-markets/[symbol]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { buildDetailPayload, type IndicatorPoint } from "@/lib/personalIndicators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = {
  params: Promise<{ symbol: string }>;
};

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { symbol: raw } = await ctx.params;
    const symbol = (raw || "").toUpperCase().trim();

    if (!symbol) {
      return NextResponse.json({ ok: false, error: "missing_symbol" }, { status: 400 });
    }

    const TAKE = 360;

    const { data: indRows, error: indErr } = await supabaseAdmin
      .from("markets_indicators")
      .select("ts,payload")
      .order("ts", { ascending: false })
      .limit(TAKE);

    if (indErr) throw indErr;
    if (!indRows?.length) {
      return NextResponse.json({ ok: false, error: "no_data" }, { status: 404 });
    }

    const latest = indRows[0];
    const latestIndicators = (latest?.payload as any)?.indicators || {};
    const latestOne = latestIndicators?.[symbol];

    if (!latestOne) {
      return NextResponse.json({ ok: false, error: "symbol_not_found" }, { status: 404 });
    }

    const series: IndicatorPoint[] = [];
    for (const r of indRows) {
      const one = (r?.payload as any)?.indicators?.[symbol];
      if (!one) continue;
      series.push({ ts: r.ts as string, v: one });
    }
    series.reverse();

    const { data: pxRows, error: pxErr } = await supabaseAdmin
      .from("markets_prices")
      .select("ts,payload")
      .order("ts", { ascending: false })
      .limit(1);

    if (pxErr) throw pxErr;
    const pricesPayload = (pxRows?.[0] as any)?.payload ?? null;

    const out = buildDetailPayload({
      symbol,
      latest: latestOne,
      series,
      pricesPayload,
    });

    return NextResponse.json({
      ok: true,
      symbol,
      updatedAt: latest.ts,
      detail: out,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
