// src/app/api/public/markets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";

// ✅ Supabase 클라이언트 쓰니까 node 런타임 강제
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/public/markets?vs=krw&per_page=250&global=1&sort=market_cap_desc
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // vs 통화 (기본 KRW)
  const vsRaw = (searchParams.get("vs") || "krw").toLowerCase();
  const vs = vsRaw === "usd" ? "usd" : "krw";

  // limit: 기존 코드가 per_page를 쓰고 있어서 둘 다 지원
  const limitParam =
    searchParams.get("limit") || searchParams.get("per_page") || "250";
  const limit = Number.isNaN(Number(limitParam)) ? 250 : Number(limitParam);

  try {
    // ─────────────────────────────────────
    // 1) Supabase에서 최신 스냅샷 1건 읽기
    //    테이블: markets_snapshots(vs, items, updated_at)
    // ─────────────────────────────────────
    const { data, error } = await supabaseAdmin
      .from("markets_snapshots") // ✅ 테이블 이름: markets_snapshots (복수형)
      .select("items, updated_at") // ✅ total 컬럼은 없음!
      .eq("vs", vs)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[/api/public/markets] Supabase error:", error);
      return NextResponse.json(
        {
          ok: false,
          error: "supabase_error",
          code: (error as any).code,
          message: (error as any).message,
          items: [],
          total: 0,
          updatedAt: null,
        },
        { status: 200 }
      );
    }

    if (!data) {
      // 아직 워커가 스냅샷을 한 번도 안 쌓았을 때
      return NextResponse.json(
        {
          ok: false,
          error: "no_snapshot",
          items: [],
          total: 0,
          updatedAt: null,
        },
        { status: 200 }
      );
    }

    const rawItems = (data.items as any[]) || [];
    const items = rawItems.slice(0, limit);

    return NextResponse.json(
      {
        ok: true,
        items,
        // ✅ total은 컬럼이 아니라 items 전체 길이로 계산
        total: rawItems.length,
        updatedAt: data.updated_at,
      },
      {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "s-maxage=30, stale-while-revalidate=30",
        },
      }
    );
  } catch (e) {
    console.error("[/api/public/markets] Unexpected error:", e);
    return NextResponse.json(
      {
        ok: false,
        error: "unexpected_error",
        items: [],
        total: 0,
        updatedAt: null,
      },
      { status: 200 }
    );
  }
}
