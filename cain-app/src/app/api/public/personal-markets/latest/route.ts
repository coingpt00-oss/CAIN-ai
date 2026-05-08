// src/app/api/public/personal-markets/latest/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { buildScannerRows } from "@/lib/personalIndicators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || "100"), 250);

    // 1) 최신 indicators (✅ VIEW 기반)
    // v_markets_indicators_latest: ts, symbol, kimchi_premium, volatility_ratio, dispersion_krw,
    // score, delay_proxy, volatility_warn
    const { data: indRows, error: indErr } = await supabaseAdmin
      .from("v_markets_indicators_latest")
      .select(
        "ts,symbol,kimchi_premium,volatility_ratio,dispersion_krw,score,delay_proxy,volatility_warn"
      )
      .order("score", { ascending: false })
      .limit(limit);

    if (indErr) {
      return NextResponse.json({ ok: false, error: indErr.message }, { status: 500 });
    }
    if (!indRows || indRows.length === 0) {
      return NextResponse.json({ ok: false, error: "no_indicators" }, { status: 404 });
    }

    // 2) 최신 prices(표시용) - 그대로 유지
    const { data: pxRow, error: pxErr } = await supabaseAdmin
      .from("markets_prices")
      .select("ts,payload")
      .order("ts", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pxErr) {
      return NextResponse.json({ ok: false, error: pxErr.message }, { status: 500 });
    }

    const px = pxRow?.payload ?? null;
    const pxTs = pxRow?.ts ?? null;

    // buildScannerRows는 "indicators: Record<symbol, row>" 형태를 기대하므로 변환
    const indicators: Record<string, any> = {};
    for (const r of indRows) {
      const sym = String(r.symbol || "").toUpperCase();
      if (!sym) continue;

      indicators[sym] = {
        // personalIndicators.ts가 쓰는 키들
        kimchi_premium: r.kimchi_premium,
        volatility_ratio: r.volatility_ratio,
        dispersion_krw: r.dispersion_krw,
        score: r.score,
        delay_proxy: r.delay_proxy,
        volatility_warn: r.volatility_warn,

        // 현재 view에 없음 → null 처리(프론트/로직 안전)
        dominance: null,
        futures_basis_pct: null,
        global_avg_usd: null,
        korea_avg_krw: null,
        rate_krw_usd: null,

        // 스프레드도 view에 없음
        dispersion_krw_domestic_spread: null,
        dispersion_krw_global_spread: null,

        // 거래소 근거데이터도 view에 없음(상세 hist에서만 가능)
        exchanges: null,
      };
    }

    const rows = buildScannerRows({
      indicators,
      pricesPayload: px,
      limit,
    });

    // 가장 최신 ts를 updatedAt으로
    const updatedAt = indRows[0]?.ts ?? pxTs ?? new Date().toISOString();

    return NextResponse.json(
      {
        ok: true,
        updatedAt,
        fx: px?.fx ?? null,
        rows,
      },
      {
        status: 200,
        headers: {
          "cache-control": "s-maxage=10, stale-while-revalidate=30",
        },
      }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
