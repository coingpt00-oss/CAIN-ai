// src/app/api/public/events/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EventRow = {
  id: string;
  source: string | null;
  title: string | null;
  url: string | null;
  categories: string[] | null;
  is_event: boolean | null;
  published_at: string | null;
  modified_at: string | null;
  created_at: string | null;
  updated_at: string | null;

  grade_hint: string | null;
  reward_certainty: string | null;
  reward_type: string | null;
  new_user_only: boolean | null;
  summary_ko: string | null;
  reward_detail: string | null;
  eligibility: string | null;
  period_text: string | null;
  participation_steps: string[] | null;
  risk_note: string | null;
  pre_filter: string | null;
  is_active: boolean | null;
};

function norm(v: unknown) {
  return String(v || "").trim().toLowerCase();
}

function isHiddenJunk(row: EventRow) {
  const title = String(row.title || "").trim();
  const pf = norm(row.pre_filter);

  if (!title) return true;
  if (title.startsWith("[TEST]")) return true;

  return [
    "manual_hide",
    "menu_or_junk",
    "not_event",
    "not_event_related",
    "system_notice",
    "maintenance",
    "listing_notice",
    "terms_or_policy",
  ].includes(pf);
}

function isDistributionNotice(row: EventRow) {
  const pf = norm(row.pre_filter);
  const certainty = norm(row.reward_certainty);
  const title = norm(row.title);

  return (
    pf === "distribution_or_result_notice" ||
    certainty === "distribution_notice" ||
    title.includes("지급 안내") ||
    title.includes("지급 완료") ||
    title.includes("지급되었습니다") ||
    title.includes("에어드랍 지급")
  );
}

function isLivePublicEvent(row: EventRow) {
  const grade = String(row.grade_hint || "").toUpperCase();
  const pf = norm(row.pre_filter);

  return row.is_active === true && !pf && ["A", "B"].includes(grade);
}

function shouldExposeEvent(row: EventRow, mode: string) {
  if (isHiddenJunk(row)) return false;

  const live = isLivePublicEvent(row);
  const notice = isDistributionNotice(row);

  if (mode === "live") return live;
  if (mode === "notice") return notice;

  // all 모드: 진행 이벤트 + 지급/결과 안내 모두 노출
  return live || notice;
}

export async function GET(req: NextRequest) {
  try {
    const u = new URL(req.url);
    const limit = Math.min(
      Math.max(Number(u.searchParams.get("limit") || "50"), 1),
      200
    );
    const source = (u.searchParams.get("source") || "").trim().toLowerCase();
    const mode = (u.searchParams.get("mode") || "all").trim().toLowerCase();

    const fetchLimit = Math.min(Math.max(limit * 5, 100), 500);

    // Supabase 타입 생성 파일이 새 컬럼을 모를 수 있어서 any로 우회
    let q: any = (supabaseAdmin.from("events") as any)
      .select(
        [
          "id",
          "source",
          "title",
          "url",
          "categories",
          "is_event",
          "published_at",
          "modified_at",
          "created_at",
          "updated_at",
          "grade_hint",
          "reward_certainty",
          "reward_type",
          "new_user_only",
          "summary_ko",
          "reward_detail",
          "eligibility",
          "period_text",
          "participation_steps",
          "risk_note",
          "pre_filter",
          "is_active",
        ].join(",")
      )
      .eq("is_event", true)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(fetchLimit);

    if (source) q = q.eq("source", source);

    const result = (await q) as {
      data: EventRow[] | null;
      error: { message?: string } | null;
    };

    if (result.error) {
      return NextResponse.json(
        { ok: false, error: result.error.message || "db_error" },
        { status: 500 }
      );
    }

    const rows = (result.data || [])
      .filter((row) => shouldExposeEvent(row, mode))
      .slice(0, limit);

    return NextResponse.json({
      ok: true,
      items: rows,
      mode,
      updatedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "unknown_error" },
      { status: 500 }
    );
  }
}