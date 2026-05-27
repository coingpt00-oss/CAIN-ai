// src/app/api/public/airdrops/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function j(status: number, body: any) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

// ✅ Next 16에서 params가 Promise일 수도 있어서 안전하게 처리
type Ctx = { params: { id: string } } | { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await Promise.resolve((ctx as any).params);

    if (!id) {
      return j(400, { ok: false, error: "missing_id" });
    }

    /**
     * ✅ 실서비스 공개 상세 기준:
     * 목록과 동일하게 airdrops_public 뷰에서 읽는다.
     *
     * 이유:
     * - C등급 / manual_hide / 잡데이터가 상세 URL로 직접 접근되는 것 방지
     * - 공개 가능한 A/B 후보만 상세페이지 노출
     */
    const { data, error } = await supabaseAdmin
      .from("airdrops_public")
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
          "chain",
          "countries",

          "grade",
          "has_reward",
          "pre_filter",
          "is_active",

          "reward_token",
          "reward_usd_lo",
          "reward_usd_hi",
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
      .maybeSingle();

    if (error) {
      console.error("[airdrops:id] supabase error:", error);
      return j(500, {
        ok: false,
        error: "supabase_error",
        detail: error,
      });
    }

    if (!data) {
      return j(404, {
        ok: false,
        error: "not_found",
      });
    }

    return j(200, {
      ok: true,
      item: data,
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