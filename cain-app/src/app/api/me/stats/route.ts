//src/app/api/me/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function j(status: number, body: any) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

// YYYY-MM-01 (이번달 시작)
function monthStart(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// 지난달 시작
function prevMonthStart(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() - 1, 1);
}

// 월 키 "YYYY-MM"
function ymKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// 보스 등급 규칙: 연속으로 “월 10회 이상” 달성한 개수에 따라 티어 상승
// 0: white(가입), 1:red, 2:blue, 3:neon green, 4:purple, 5:silver, 6:gold
function calcTierFromMonthlyCounts(map: Record<string, number>) {
  // 기준은 "지난달"부터 거꾸로 연속 달성
  const now = new Date();
  let cursor = prevMonthStart(now);

  let streak = 0;
  for (let i = 0; i < 6; i++) {
    const key = ymKey(cursor);
    const cnt = map[key] ?? 0;
    if (cnt >= 10) {
      streak++;
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
      continue;
    }
    break;
  }

  // 가입 직후는 0, 연속 1달 성공이면 1, ... 최대 6
  return Math.min(6, streak);
}

export async function GET(req: NextRequest) {
  try {
    // ✅ 보스 프로젝트의 인증 방식에 맞게 uid를 가져오시면 됩니다요.
    // 예시: cookie/헤더/세션에서 uid 추출
    const uid = req.headers.get("x-cain-uid") || ""; // <- 보스 인증에 맞게 교체

    if (!uid) return j(401, { ok: false, error: "unauthorized" });

    // 1) 유저 기본정보(가입일)
    const u = await supabaseAdmin
      .from("users")
      .select("uid, created_at, exchange, country, username")
      .eq("uid", uid)
      .maybeSingle();

    const user = u.data as any;
    if (!user) return j(404, { ok: false, error: "user_not_found" });

    const createdAt = user.created_at ? new Date(user.created_at) : null;
    const daysSince = createdAt
      ? Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 86400000))
      : 0;

    // 2) 이번달 출석 카운트
    const start = monthStart();
    const startISO = start.toISOString();

    const monthCountRes = await supabaseAdmin
      .from("user_checkins")
      .select("id", { count: "exact", head: true })
      .eq("uid", uid)
      .gte("created_at", startISO);

    const thisMonthCount = monthCountRes.count ?? 0;

    // 3) 등급 계산용: 최근 7개월 월별 집계(이번달 포함)
    // 간단히 최근 N개만 가져와서 JS에서 월별로 묶습니다요.
    const since = new Date();
    since.setMonth(since.getMonth() - 7);

    const recent = await supabaseAdmin
      .from("user_checkins")
      .select("created_at")
      .eq("uid", uid)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false });

    const monthlyMap: Record<string, number> = {};
    for (const row of recent.data ?? []) {
      const d = new Date((row as any).created_at);
      const k = ymKey(d);
      monthlyMap[k] = (monthlyMap[k] ?? 0) + 1;
    }

    const tier = calcTierFromMonthlyCounts(monthlyMap);

    return j(200, {
      ok: true,
      uid: user.uid,
      exchange: user.exchange ?? null,
      country: user.country ?? null,
      created_at: user.created_at ?? null,
      daysSince,
      thisMonthCount,
      tier,
    });
  } catch (e: any) {
    return j(500, { ok: false, error: "server_error", detail: String(e?.message ?? e) });
  }
}
