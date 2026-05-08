// src/app/api/admin/users/pending/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireAdminFromRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // ✅ 1) 관리자 권한 확인
  const auth = await requireAdminFromRequest(req);
  if (!auth.ok) {
    const status = auth.error === "forbidden" ? 403 : 401;
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status }
    );
  }

  // ✅ 2) 승인 대기(is_verified = false)인 유저만 조회
  const { data, error } = await supabaseAdmin
    .from("users")
    .select(
      "uid, username, name, phone, exchange, nationality, created_at, is_verified"
    )
    .eq("is_verified", false)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    users: data ?? [],
  });
}
