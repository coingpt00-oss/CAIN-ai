// src/app/api/admin/users/[uid]/approve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireAdminFromRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest, context: any) {
  const params = await context?.params;
  const uid = String(params?.uid || "").trim();

  if (!uid) {
    return NextResponse.json(
      { ok: false, error: "invalid_uid" },
      { status: 400 }
    );
  }

  const auth = await requireAdminFromRequest(req);
  if (!auth.ok) {
    const status = auth.error === "forbidden" ? 403 : 401;
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .update({ is_verified: true })
    .eq("uid", uid)
    .select("id, uid, username, is_verified, exchange, nationality, created_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, error: "db_error", detail: error.message },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 }
    );
  }

  if (!data.is_verified) {
    return NextResponse.json(
      { ok: false, error: "approve_failed_no_change", user: data },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, user: data });
}