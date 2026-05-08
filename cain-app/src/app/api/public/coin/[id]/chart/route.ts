// src/app/api/public/coin/[id]/chart/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";

type RangeKey = "24h" | "30d" | "90d" | "1y";

// days 매핑
function mapRangeToDays(range: string | null): number {
  switch (range) {
    case "24h":
      return 1;
    case "30d":
      return 30;
    case "90d":
      return 90;
    case "1y":
      return 365;
    default:
      return 1;
  }
}

// GET /api/public/coin/[id]/chart?range=24h&vs=usd
export async function GET(req: NextRequest, context: any) {
  try {
    const search = req.nextUrl.searchParams;
    const range = (search.get("range") as RangeKey) || "24h";
    const vs = search.get("vs") || "usd";

    // ✅ params가 Promise든 아니든 전부 처리
    const params = await context?.params;
    const id = params?.id as string;

    const days = mapRangeToDays(range);

    // Supabase에서 조회
    const { data, error } = await supabaseAdmin
      .from("charts_snapshots")
      .select("*")
      .eq("id", id)
      .eq("vs", vs)
      .eq("days", days)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { ok: false, error: "snapshot_not_found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      id,
      vs,
      range,
      points: data.points ?? [],
      updatedAt: data.updated_at ?? null,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
