// src/app/api/public/news/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_HEADERS: Record<string, string> = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "public, max-age=0, must-revalidate",
  "cdn-cache-control": "public, s-maxage=60, stale-while-revalidate=300",
  "vercel-cdn-cache-control": "public, s-maxage=60, stale-while-revalidate=300",
};

function j(status: number, body: any, headers?: Record<string, string>) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      ...CACHE_HEADERS,
      ...(headers || {}),
    },
  });
}

function cleanParam(v: string | null) {
  return String(v || "").trim();
}

function cleanLimit(v: string | null) {
  const n = Number(v || 20);
  if (!Number.isFinite(n)) return 20;
  return Math.min(Math.max(Math.floor(n), 1), 50);
}

function cleanOffset(v: string | null) {
  const n = Number(v || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(Math.floor(n), 0);
}

function escapeIlikeValue(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/,/g, " ")
    .replace(/\(/g, " ")
    .replace(/\)/g, " ")
    .trim();
}

function orIlikeForFields(fields: string[], terms: string[]) {
  const parts: string[] = [];

  for (const rawTerm of terms) {
    const term = escapeIlikeValue(rawTerm);
    if (!term) continue;

    for (const field of fields) {
      parts.push(`${field}.ilike.%${term}%`);
    }
  }

  return parts.join(",");
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const limit = cleanLimit(searchParams.get("limit"));
    const offset = cleanOffset(searchParams.get("offset"));

    const qText = cleanParam(searchParams.get("q"));
    const lang = cleanParam(searchParams.get("lang"));
    const source = cleanParam(searchParams.get("source"));
    const tab = cleanParam(searchParams.get("tab")) || "all";

    const sb = supabaseServer();

    const useEstimatedCount = Boolean(qText);

    let q = sb
      .from("news_posts")
      .select(
        "id, slot_key, created_at, source_code, source, title, url, summary, image_url, origin_image_url, origin_site_name, lang, primary_category, news_categories",
        { count: useEstimatedCount ? "planned" : "exact" }
      )
      .eq("is_crypto_relevant", true)
      .eq("is_visible", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (lang) q = q.eq("lang", lang);
    if (source) q = q.eq("source_code", source);

    if (tab && tab !== "all") {
      q = q.contains("news_categories", [tab]);
    }

    if (qText) {
      const keywordOr = orIlikeForFields(
        ["title", "summary", "source", "origin_site_name", "source_code"],
        [qText]
      );
      if (keywordOr) q = q.or(keywordOr);
    }

    const { data, error, count } = await q;

    if (error) {
      return j(500, { ok: false, error: error.message });
    }

    return j(200, {
      ok: true,
      items: data || [],
      page: {
        limit,
        offset,
        total: count ?? null,
        page: Math.floor(offset / limit) + 1,
        totalPages: count == null ? null : Math.max(1, Math.ceil(count / limit)),
      },
      filters: {
        q: qText || null,
        source: source || null,
        lang: lang || null,
        tab,
      },
      updatedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    return j(500, { ok: false, error: String(e?.message || e) });
  }
}