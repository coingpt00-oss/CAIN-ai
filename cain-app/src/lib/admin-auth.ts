// src/lib/admin-auth.ts
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";

export async function requireAdminFromRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const [, token] = authHeader.split(" ");

  if (!token) {
    return { ok: false as const, error: "no_token", user: null };
  }

  // ✅ token으로 유저 찾고 role로 관리자 판정
  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("uid, username, role")
    .eq("token", token)
    .maybeSingle();

  if (error) {
    return { ok: false as const, error: error.message, user: null };
  }

  if (!user || user.role !== "admin") {
    return { ok: false as const, error: "forbidden", user: null };
  }

  return { ok: true as const, error: null, user };
}
