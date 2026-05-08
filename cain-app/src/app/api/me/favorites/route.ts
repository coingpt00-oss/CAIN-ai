// src/app/api/me/favorites/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUserFromRequest } from "@/lib/user-auth";
import { supabaseAdmin } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";

function jsonError(message: string, status = 400) {
  return NextResponse.json(
    { ok: false, error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

function normalizeCoinId(input: unknown) {
  if (typeof input !== "string") return "";
  return input.trim().toUpperCase();
}

export async function GET(req: NextRequest) {
  const auth = await requireUserFromRequest(req);
  if (!auth.ok || !auth.user) {
    const status = auth.error === "no_token" ? 401 : 403;
    return jsonError(auth.error || "unauthorized", status);
  }

  const { data, error } = await supabaseAdmin
    .from("user_favorites")
    .select("coin_id, created_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: true });

  if (error) {
    return jsonError(error.message, 500);
  }

  const favorites = (data || [])
    .map((row) => row.coin_id)
    .filter((coinId): coinId is string => typeof coinId === "string" && !!coinId);

  return NextResponse.json(
    {
      ok: true,
      favorites,
      rows: data || [],
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(req: NextRequest) {
  const auth = await requireUserFromRequest(req);
  if (!auth.ok || !auth.user) {
    const status = auth.error === "no_token" ? 401 : 403;
    return jsonError(auth.error || "unauthorized", status);
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return jsonError("invalid_json", 400);
  }

  const coinId = normalizeCoinId(body?.coinId);
  if (!coinId) {
    return jsonError("coinId_required", 400);
  }

  const { error } = await supabaseAdmin.from("user_favorites").upsert(
    {
      user_id: auth.user.id,
      uid: auth.user.uid,
      coin_id: coinId,
    },
    {
      onConflict: "user_id,coin_id",
      ignoreDuplicates: false,
    }
  );

  if (error) {
    return jsonError(error.message, 500);
  }

  return NextResponse.json(
    {
      ok: true,
      favorite: coinId,
      action: "added",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUserFromRequest(req);
  if (!auth.ok || !auth.user) {
    const status = auth.error === "no_token" ? 401 : 403;
    return jsonError(auth.error || "unauthorized", status);
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return jsonError("invalid_json", 400);
  }

  const coinId = normalizeCoinId(body?.coinId);
  if (!coinId) {
    return jsonError("coinId_required", 400);
  }

  const { error } = await supabaseAdmin
    .from("user_favorites")
    .delete()
    .eq("user_id", auth.user.id)
    .eq("coin_id", coinId);

  if (error) {
    return jsonError(error.message, 500);
  }

  return NextResponse.json(
    {
      ok: true,
      favorite: coinId,
      action: "removed",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}