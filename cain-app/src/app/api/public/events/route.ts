// src/app/api/public/events/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anon, { auth: { persistSession: false } });
}

export async function GET(req: NextRequest) {
  try {
    const u = new URL(req.url);
    const limit = Math.min(Number(u.searchParams.get("limit") || "50"), 200);
    const source = (u.searchParams.get("source") || "").trim(); // upbit | bithumb | ...

    const sb = supabase();

    let q = sb
      .from("events")
      .select(
        "id, source, title, url, categories, is_event, published_at, modified_at, created_at"
      )
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (source) q = q.eq("source", source);

    const { data, error } = await q;

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      items: data || [],
      updatedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "unknown_error" },
      { status: 500 }
    );
  }
}
