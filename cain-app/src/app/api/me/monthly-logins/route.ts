// src/app/api/me/monthly-logins/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const uid =
    req.nextUrl.searchParams.get("uid") ||
    req.headers.get("x-cain-uid") ||
    "";

  if (!uid) {
    return NextResponse.json(
      { ok: false, error: "missing_uid" },
      { status: 400 }
    );
  }

  // 파일명은 monthly-logins지만, 보스 요청 기준으로 월별 초기화 없이 누적 출석 수를 반환합니다.
  // 출석은 login_events가 아니라 user_checkins 기준입니다.
  // login_events는 로그인 횟수라 하루 여러 번 로그인하면 부풀 수 있습니다.
  const { count, error } = await supabaseAdmin
    .from("user_checkins")
    .select("uid", { count: "exact", head: true })
    .eq("uid", uid);

  if (error) {
    return NextResponse.json(
      { ok: false, error: String(error.message) },
      { status: 500 }
    );
  }

  const total = count ?? 0;

  return NextResponse.json({
    ok: true,
    count: total,
    totalCheckins: total,
    totalLogins: total,
    monthlyLogins: total,
  });
}