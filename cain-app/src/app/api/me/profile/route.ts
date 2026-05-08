// src/app/api/me/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ✅ KST 기준 "YYYY-MM"
function getKstMonthString() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`; // "2025-12"
}

// ✅ KST 기준 "이번달" 범위를 UTC ISO로 변환해서 리턴
function getKstMonthRangeUtcIso() {
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);

  const y = kstNow.getUTCFullYear();
  const m = kstNow.getUTCMonth(); // 0~11 (KST를 UTC getter로 읽는 트릭)

  // KST yyyy-mm-01 00:00:00 를 UTC instant로 변환
  // KST 00:00 = UTC 전날 15:00 이므로 -9h
  const startUtc = new Date(Date.UTC(y, m, 1, 0, 0, 0) - 9 * 60 * 60 * 1000);

  // 다음달 KST 1일 00:00
  const endUtc = new Date(
    Date.UTC(y, m + 1, 1, 0, 0, 0) - 9 * 60 * 60 * 1000
  );

  return { startIso: startUtc.toISOString(), endIso: endUtc.toISOString() };
}

// ✅ tier 규칙 (보스가 원하면 여기만 바꾸면 끝)
function calcTier(monthlyLogins: number) {
  if (monthlyLogins >= 10) return 1; // RED
  return 0; // WHITE
}

export async function GET(req: NextRequest) {
  const uid = req.headers.get("x-cain-uid")?.trim();
  if (!uid) {
    return NextResponse.json({ ok: false, error: "missing_uid" }, { status: 400 });
  }

  // 1) 유저 기본 프로필 (+ tier_effective_month + must_change_password 포함)
  const { data: user, error: uErr } = await supabaseAdmin
    .from("users")
    .select(
      "uid, username, exchange, nationality, role, created_at, tier, tier_effective_month, must_change_password"
    )
    .eq("uid", uid)
    .maybeSingle();

  if (uErr) {
    return NextResponse.json({ ok: false, error: uErr.message }, { status: 500 });
  }
  if (!user) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  // 2) ✅ 마이페이지 진입 순간: "이번 달에 아직 티어 확정 안 했으면"만 계산/반영
  //    - tier_effective_month === thisMonth 이면 스킵
  try {
    const thisMonth = getKstMonthString();
    const effective = (user as any).tier_effective_month as string | null;

    // 이번 달에 이미 티어 반영했으면 그대로 반환
    if (effective !== thisMonth) {
      const { startIso, endIso } = getKstMonthRangeUtcIso();

      const { count, error: cErr } = await supabaseAdmin
        .from("login_events")
        .select("id", { head: true, count: "exact" })
        .eq("uid", uid)
        .gte("created_at", startIso)
        .lt("created_at", endIso);

      if (!cErr) {
        const monthlyLogins = Number(count ?? 0);
        const nextTier = calcTier(monthlyLogins);
        const curTier = Number((user as any).tier ?? 0);

        // ✅ tier or effective_month 둘 중 하나라도 달라지면 업데이트
        if (nextTier !== curTier || effective !== thisMonth) {
          const { error: upErr } = await supabaseAdmin
            .from("users")
            .update({
              tier: nextTier,
              tier_effective_month: thisMonth,
            })
            .eq("uid", uid);

          if (!upErr) {
            // 응답에도 반영
            (user as any).tier = nextTier;
            (user as any).tier_effective_month = thisMonth;
          }
        }
      }
    }
  } catch {
    // ✅ tier 갱신 실패는 마이페이지 자체를 막지 않음 (안정성 우선)
  }

  return NextResponse.json({ ok: true, user });
}