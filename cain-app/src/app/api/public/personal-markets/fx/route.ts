// src/app/api/public/personal-markets/fx/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * FX는 1) system_meta.EXCHANGE_RATE_KRW_USD (정석)
 *     2) fallback: markets_prices 최신 payload.fx.krw_per_usd
 * 순서로 읽습니다.
 */
export async function GET(_req: NextRequest) {
  try {
    // 1) system_meta에서 우선 조회
    const { data: metaRow, error: metaErr } = await supabaseAdmin
      .from("system_meta")
      .select("value, updated_at")
      .eq("key", "EXCHANGE_RATE_KRW_USD")
      .maybeSingle();

    if (metaErr) {
      // meta 에러가 있어도 fallback으로 계속
      console.warn("fx meta read error:", metaErr.message);
    }

    const metaFx = Number(metaRow?.value ?? "");
    if (Number.isFinite(metaFx) && metaFx > 500) {
      return NextResponse.json(
        { ok: true, fx: metaFx, updated_at: metaRow?.updated_at ?? null, source: "system_meta" },
        { status: 200 }
      );
    }

    // 2) fallback: markets_prices 최신에서 fx 읽기
    const { data: pRows, error: pErr } = await supabaseAdmin
      .from("markets_prices")
      .select("ts, payload")
      .order("ts", { ascending: false })
      .limit(1);

    if (pErr) {
      return NextResponse.json({ ok: false, error: pErr.message }, { status: 500 });
    }

    const latest = pRows?.[0];
    const fx2 = Number(latest?.payload?.fx?.krw_per_usd ?? "");
    if (Number.isFinite(fx2) && fx2 > 500) {
      return NextResponse.json(
        { ok: true, fx: fx2, updated_at: latest?.ts ?? null, source: "markets_prices" },
        { status: 200 }
      );
    }

    // 3) 그래도 없으면 0 주지 말고 "없다"를 명확히
    return NextResponse.json(
      { ok: false, error: "fx_not_ready", fx: null, updated_at: null },
      { status: 503 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
