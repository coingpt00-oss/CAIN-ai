import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";

export const runtime = "nodejs";

type Body = {
  uid: string;
  airdrop?: boolean;
  event?: boolean;
  community?: boolean;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<Body>;
    if (!body?.uid) return NextResponse.json({ ok: false, error: "missing_uid" }, { status: 400 });

    const uid = String(body.uid).trim();

    const patch: any = { uid, updated_at: new Date().toISOString() };
    if (typeof body.airdrop === "boolean") patch.airdrop = body.airdrop;
    if (typeof body.event === "boolean") patch.event = body.event;
    if (typeof body.community === "boolean") patch.community = body.community;

    const { error } = await supabaseAdmin
      .from("user_noti_prefs")
      .upsert(patch, { onConflict: "uid" });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
