import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";

export const runtime = "nodejs";

type Body = {
  uid: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<Body>;

    if (!body?.uid || !body?.endpoint || !body?.p256dh || !body?.auth) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    const uid = String(body.uid).trim();

    // 1) upsert subscription
    const { error } = await supabaseAdmin
      .from("user_push_subscriptions")
      .upsert(
        {
          uid,
          endpoint: body.endpoint,
          p256dh: body.p256dh,
          auth: body.auth,
          user_agent: body.user_agent ?? "",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "uid,endpoint" }
      );

    if (error) {
      return NextResponse.json({ ok: false, error: String(error.message) }, { status: 500 });
    }

    // 2) prefs row 없으면 기본값 생성
    await supabaseAdmin
      .from("user_noti_prefs")
      .upsert({ uid }, { onConflict: "uid" });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
