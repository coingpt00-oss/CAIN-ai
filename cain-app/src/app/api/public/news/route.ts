// app/api/public/news/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs"; // supabase-js 안정
export const dynamic = "force-dynamic";

function j(status: number, body: any, headers?: Record<string, string>) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // ✅ 캐시(원하면 조절): CDN 30초 + SWR 60초
      "cache-control": "s-maxage=30, stale-while-revalidate=60",
      ...(headers || {}),
    },
  });
}

/**
 * GET /api/public/news?limit=30&offset=0&lang=ko&source=tokenpost
 * - source: source_code 값 (tokenpost / blockmedia / decenter / coindesk_en)
 * - lang: ko|en
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 30), 1), 100);
    const offset = Math.max(Number(searchParams.get("offset") || 0), 0);

    const lang = (searchParams.get("lang") || "").trim();
    const source = (searchParams.get("source") || "").trim();

    const sb = supabaseServer();

    // ✅ 필요한 컬럼만: 화면 렌더용 최소 셋
    let q = sb
      .from("news_posts")
      .select(
        "slot_key, created_at, source_code, source, title, url, summary, image_url, origin_image_url, origin_site_name, lang",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (lang) q = q.eq("lang", lang);
    if (source) q = q.eq("source_code", source);

    const { data, error, count } = await q;

    if (error) {
      return j(500, { ok: false, error: error.message });
    }

    return j(200, {
      ok: true,
      items: data || [],
      page: { limit, offset, total: count ?? null },
    });
  } catch (e: any) {
    return j(500, { ok: false, error: String(e?.message || e) });
  }
}
