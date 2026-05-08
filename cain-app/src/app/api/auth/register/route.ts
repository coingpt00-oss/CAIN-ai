// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase-service";

export const runtime = "nodejs";

type RegisterBody = {
  nationality?: string; // South Korea, United States...
  exchange: "binance" | "okx" | "bitget" | "bybit";
  uid: string;
  name: string;
  phone: string;
  username: string; // 닉네임(중복 불가)
  password: string; // 사용자가 설정
  device_id: string; // 프론트에서 생성해서 내려줌
  device_type?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<RegisterBody>;

    // 1) 필수값 체크
    if (
      !body?.exchange ||
      !body?.uid ||
      !body?.name ||
      !body?.phone ||
      !body?.username ||
      !body?.password ||
      !body?.device_id
    ) {
      return NextResponse.json(
        { ok: false, error: "missing_fields" },
        { status: 400 }
      );
    }

    const uid = body.uid.trim();
    const username = body.username.trim();

    // 2) username 중복 체크
    const { data: dupUser, error: dupErr } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (dupErr) {
      return NextResponse.json(
        { ok: false, error: dupErr.message },
        { status: 500 }
      );
    }
    if (dupUser) {
      return NextResponse.json(
        { ok: false, error: "username_taken" },
        { status: 409 }
      );
    }

    // 3) uid 중복 체크
    const { data: dupUid, error: dupUidErr } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("uid", uid)
      .maybeSingle();

    if (dupUidErr) {
      return NextResponse.json(
        { ok: false, error: dupUidErr.message },
        { status: 500 }
      );
    }
    if (dupUid) {
      return NextResponse.json(
        { ok: false, error: "uid_taken" },
        { status: 409 }
      );
    }

    // 4) 비번 해시
    const password_hash = await bcrypt.hash(body.password, 10);

    // 5) users insert (role을 무조건 user로 고정)
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("users")
      .insert({
        nationality: body.nationality ?? null,
        exchange: body.exchange,
        uid,
        name: body.name,
        phone: body.phone,
        username,
        password_hash,
        is_verified: false,
        role: "user", // ✅ 새 회원은 무조건 일반 유저
      })
      .select("*")
      .single();

    if (insErr || !inserted) {
      return NextResponse.json(
        { ok: false, error: insErr?.message ?? "insert_failed" },
        { status: 500 }
      );
    }

    // 6) 토큰 발급 (DB 함수)
    const { data: tokenRes, error: tErr } = await supabaseAdmin.rpc(
      "issue_user_token",
      { p_uid: uid }
    );

    if (tErr) {
      return NextResponse.json(
        { ok: false, error: tErr.message },
        { status: 500 }
      );
    }

    const token = (tokenRes as any)?.token ?? tokenRes;

    // 7) 디바이스 등록 + 2기기 제한 (DB 함수)
    const ua = req.headers.get("user-agent") ?? "";
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("cf-connecting-ip") ??
      "";

    const { error: dErr } = await supabaseAdmin.rpc(
      "register_device_and_enforce_limit",
      {
        p_uid: uid,
        p_device_id: body.device_id,
        p_user_agent: ua,
        p_ip: ip,
        p_max_devices: 2,
      }
    );

    if (dErr) {
      return NextResponse.json(
        { ok: false, error: dErr.message },
        { status: 500 }
      );
    }

    // ✅ 8) 가입 발생 → ops-worker 푸시 트리거
    try {
      const opsUrl = process.env.OPS_WORKER_URL; // 예: https://cain-ops-worker.xxx.workers.dev
      const adminKey = process.env.ADMIN_KEY;

      if (opsUrl && adminKey) {
        await fetch(`${opsUrl}/admin/push?key=${adminKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "new_register",
            uid,
            username,
            exchange: body.exchange,
            nationality: body.nationality ?? null,
          }),
        });
      }
    } catch {
      // 푸시 실패해도 가입 자체는 성공 처리
    }

    // 9) 성공 응답 (role도 함께 내려줌)
    return NextResponse.json({
      ok: true,
      user: {
        uid: inserted.uid,
        username: inserted.username,
        exchange: inserted.exchange,
        nationality: inserted.nationality ?? null,
        is_verified: inserted.is_verified,
        role: inserted.role, // ✅ 여기서도 role 확인 가능
      },
      token,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "unknown_error" },
      { status: 500 }
    );
  }
}
