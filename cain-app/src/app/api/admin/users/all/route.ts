// src/app/api/admin/users/all/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireAdminFromRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireAdminFromRequest(req);
  if (!auth.ok) {
    const status = auth.error === "forbidden" ? 403 : 401;
    return NextResponse.json({ ok: false, error: auth.error }, { status });
  }

  // ✅ 관리자용: 전체 회원 리스트(민감정보 제외)
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("uid, username, name, phone, exchange, nationality, role, created_at, is_verified")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, users: data ?? [] });
}
