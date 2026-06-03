// src/app/api/public/airdrops/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "public, s-maxage=300, stale-while-revalidate=1800",
};

function j(status: number, body: any) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: CACHE_HEADERS,
  });
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

function hiddenPreFilter(v: unknown) {
  const pf = String(v || "").trim().toLowerCase();

  return [
    "legacy_worker_disabled",
    "manual_hide",
    "menu_or_junk",
    "low_confidence",
  ].includes(pf);
}

// Next 16에서 params가 Promise일 수도 있어서 안전하게 처리
type Ctx = { params: { id: string } } | { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await Promise.resolve((ctx as any).params);

    if (!id || !isUuid(id)) {
      return j(400, { ok: false, error: "invalid_id", id: id ?? "" });
    }

    const result = (await (supabaseAdmin.from("airdrops") as any)
      .select(
        [
          "id",
          "created_at",
          "updated_at",

          "source",
          "source_id",

          "title",
          "description_short",

          "exchange",
          "link_url",
          "canonical_url",
          "chain",
          "countries",

          "grade",
          "has_reward",
          "pre_filter",
          "is_active",

          "reward_token",
          "reward_usd_lo",
          "reward_usd_hi",
          "reward_hint",
          "reward_detail",

          "kyc_required",
          "task_effort_mins",
          "claim_eta_days",

          "start_at",
          "end_at",
          "period_text",

          "summary_ko",
          "eligibility",
          "participation_steps",
          "quality_score",
          "ai_brief",

          "detail_excerpt",
          "risk_note",
          "publish_at",
          "last_checked_at",
        ].join(",")
      )
      .eq("id", id)
      .maybeSingle()) as {
      data: Record<string, any> | null;
      error: { message?: string } | null;
    };

    if (result.error) {
      console.error("[airdrops:id] supabase error:", result.error);

      return j(500, {
        ok: false,
        error: "supabase_error",
        detail: result.error,
      });
    }

    if (!result.data || hiddenPreFilter(result.data.pre_filter)) {
      return j(404, {
        ok: false,
        error: "not_found",
      });
    }

    return j(200, {
      ok: true,
      item: result.data,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[airdrops:id] unexpected error:", err);

    return j(500, {
      ok: false,
      error: "unexpected_error",
      detail: String(err),
    });
  }
}