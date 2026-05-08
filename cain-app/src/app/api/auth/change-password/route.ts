// src/app/api/auth/change-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase-service";

export const runtime = "nodejs";

const COOKIE_NAME = "cain_sess";

function clearSessionCookie(res: NextResponse) {
  const isProd = process.env.NODE_ENV === "production";

  res.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  // 구버전 쿠키를 혹시 쓰고 있을 경우까지 같이 정리합니다.
  res.cookies.set({
    name: "cain_token",
    value: "",
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { username, current_password, new_password } = await req.json();

    if (!username || !current_password || !new_password) {
      return NextResponse.json(
        { ok: false, error: "missing_fields" },
        { status: 400 }
      );
    }

    if (String(new_password).length < 8) {
      return NextResponse.json(
        { ok: false, error: "password_too_short" },
        { status: 400 }
      );
    }

    // 1️⃣ 유저 조회
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("uid, password_hash")
      .eq("username", String(username).trim())
      .maybeSingle();

    if (error || !user) {
      return NextResponse.json(
        { ok: false, error: "user_not_found" },
        { status: 404 }
      );
    }

    // 2️⃣ 기존 비밀번호 검증
    const match = await bcrypt.compare(
      current_password,
      user.password_hash ?? ""
    );

    if (!match) {
      return NextResponse.json(
        { ok: false, error: "invalid_current_password" },
        { status: 401 }
      );
    }

    // 3️⃣ 새 비밀번호 해시
    const newHash = await bcrypt.hash(new_password, 10);

    // 4️⃣ 비밀번호 업데이트
    const { error: updateErr } = await supabaseAdmin
      .from("users")
      .update({
        password_hash: newHash,
        must_change_password: false,
        temp_password_issued_at: null,
      })
      .eq("uid", user.uid);

    if (updateErr) {
      return NextResponse.json(
        { ok: false, error: updateErr.message || "password_update_failed" },
        { status: 500 }
      );
    }

    // 5️⃣ ✅ 모든 디바이스 로그아웃
    // (A) 디바이스 기록 삭제
    try {
      await supabaseAdmin.from("devices").delete().eq("uid", user.uid);
    } catch {
      // devices 테이블 문제가 있어도 비밀번호 변경 자체는 성공 처리합니다.
    }

    // (B) 토큰 재발급 → 기존 토큰 전부 무효화
    const { error: tokenErr } = await supabaseAdmin.rpc("issue_user_token", {
      p_uid: user.uid,
    });

    if (tokenErr) {
      return NextResponse.json(
        { ok: false, error: tokenErr.message || "token_rotate_failed" },
        { status: 500 }
      );
    }

    const res = NextResponse.json({
      ok: true,
      logged_out_all_devices: true,
      message:
        "비밀번호가 변경되었습니다. 보안을 위해 모든 기기에서 로그아웃되었습니다.",
    });

    // ✅ cain_sess는 HTTPOnly 쿠키라 프론트 localStorage 제거만으로는 지워지지 않습니다.
    // 서버 응답에서 명시적으로 삭제해야 합니다.
    clearSessionCookie(res);

    return res;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "server_error" },
      { status: 500 }
    );
  }
}