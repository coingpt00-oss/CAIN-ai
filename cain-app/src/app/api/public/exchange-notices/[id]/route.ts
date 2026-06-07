// src/app/api/public/exchange-notices/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const CACHE_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "public, s-maxage=180, stale-while-revalidate=600",
};

function j(status: number, body: any) {
  return new NextResponse(JSON.stringify(body), { status, headers: CACHE_HEADERS });
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const noticeId = String(id || "").trim();

    if (!noticeId) {
      return j(400, {
        ok: false,
        item: null,
        error: "missing_id",
        updatedAt: new Date().toISOString(),
      });
    }

    const { data, error } = await (supabaseAdmin.from("exchange_notices_public") as any)
      .select(
        [
          "id",
          "created_at",
          "updated_at",
          "last_checked_at",
          "source",
          "source_id",
          "exchange",
          "title",
          "summary_ko",
          "detail_excerpt",
          "url",
          "category",
          "notice_type",
          "severity",
          "symbols",
          "chains",
          "markets",
          "published_at",
          "source_published_at",
          "modified_at",
          "detail_fetch_status",
          "detail_fetched_at",
          "is_active",
          "is_important",
        ].join(",")
      )
      .eq("id", noticeId)
      .maybeSingle();

    if (error) {
      return j(500, {
        ok: false,
        item: null,
        error: error.message || "supabase_error",
        detail: error,
        updatedAt: new Date().toISOString(),
      });
    }

    if (!data) {
      return j(404, {
        ok: false,
        item: null,
        error: "not_found",
        updatedAt: new Date().toISOString(),
      });
    }

    return j(200, { ok: true, item: data, updatedAt: new Date().toISOString() });
  } catch (err: any) {
    return j(500, {
      ok: false,
      item: null,
      error: err?.message || "unexpected_error",
      detail: String(err),
      updatedAt: new Date().toISOString(),
    });
  }
}