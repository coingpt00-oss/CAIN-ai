import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";

export const runtime = "nodejs";

type Body = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<Body>;

    if (!body?.endpoint || !body?.p256dh || !body?.auth) {
      return NextResponse.json(
        { ok: false, error: "missing_fields" },
        { status: 400 }
      );
    }

    // endpoint 기준 upsert (중복 저장 방지)
    const { error } = await supabaseAdmin
      .from("admin_push_subscriptions")
      .upsert(
        {
          endpoint: body.endpoint,
          p256dh: body.p256dh,
          auth: body.auth,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      );

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "unknown_error" },
      { status: 500 }
    );
  }
}
