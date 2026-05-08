// src/app/api/me/devices/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireUserFromRequest } from "@/lib/user-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireUserFromRequest(req);

  if (!auth.ok) {
    const status =
      auth.error === "not_verified" ? 403 : auth.error === "no_token" ? 401 : 401;

    return NextResponse.json(
      { ok: false, error: auth.error },
      { status }
    );
  }

  const uid = auth.user!.uid;

  const { data, error } = await supabaseAdmin
    .from("devices") // ✅ 여기만 DB 실제 테이블명에 맞춰 수정하면 됨
    .select("device_id, device_name, platform, last_seen_at, created_at, ip")
    .eq("uid", uid)
    .order("last_seen_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { ok: false, error: "db_error", detail: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, devices: data ?? [] });
}
