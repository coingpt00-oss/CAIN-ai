// src/app/api/public/events/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

export async function GET(
  _req: NextRequest,
  // ✅ Next 16 + Turbopack: params가 Promise로 들어올 수 있음
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  if (!id || !isUuid(id)) {
    return NextResponse.json(
      { ok: false, error: "invalid_id", id: id ?? "" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("events")
    .select("id, source, title, url, published_at, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, error: "db_error", detail: error.message },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { ok: false, error: "not_found", id },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, item: data });
}
