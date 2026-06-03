// src/app/api/public/events/[id]/route.ts
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

  detail_body: string | null;
  reward_rate_text: string | null;
  reward_cap_text: string | null;
  min_deposit_text: string | null;
  required_action: string | null;
  event_start_at: string | null;
  event_end_at: string | null;
  payout_text: string | null;
  expected_profit_note: string | null;

  raw?: any;
};

const CACHE_HEADERS = {
  "cache-control": "public, s-maxage=300, stale-while-revalidate=1800",
};

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

function hiddenPreFilter(v: unknown) {
  const pf = String(v || "").trim().toLowerCase();

  return [
    "manual_hide",
    "menu_or_junk",
    "not_event",
    "not_event_related",
    "system_notice",
    "maintenance",
    "listing_notice",
    "terms_or_policy",
    "airdrop_like_for_later",
    "region_restricted_or_unclear",
  ].includes(pf);
}

type Ctx = { params: { id: string } } | { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await Promise.resolve((ctx as any).params);

    if (!id || !isUuid(id)) {
      return NextResponse.json(
        { ok: false, error: "invalid_id", id: id ?? "" },
        { status: 400, headers: CACHE_HEADERS }
      );
    }

    const result = (await (supabaseAdmin.from("events") as any)
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

          "detail_body",
          "reward_rate_text",
          "reward_cap_text",
          "min_deposit_text",
          "required_action",
          "event_start_at",
          "event_end_at",
          "payout_text",
          "expected_profit_note",

          "raw",
        ].join(",")
      )
      .eq("id", id)
      .maybeSingle()) as {
      data: EventRow | null;
      error: { message?: string } | null;
    };

    if (result.error) {
      return NextResponse.json(
        { ok: false, error: "db_error", detail: result.error.message },
        { status: 500, headers: CACHE_HEADERS }
      );
    }

    if (!result.data) {
      return NextResponse.json(
        { ok: false, error: "not_found", id },
        { status: 404, headers: CACHE_HEADERS }
      );
    }

    const item = result.data;
    const title = String(item.title || "").trim();

    if (title.startsWith("[TEST]") || hiddenPreFilter(item.pre_filter)) {
      return NextResponse.json(
        { ok: false, error: "not_found", id },
        { status: 404, headers: CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        item,
        updatedAt: new Date().toISOString(),
      },
      { headers: CACHE_HEADERS }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "unknown_error" },
      { status: 500, headers: CACHE_HEADERS }
    );
  }
}