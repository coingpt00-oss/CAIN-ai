// src/app/api/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUserFromRequest } from "@/lib/user-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireUserFromRequest(req);

  if (!auth.ok) {
    const status =
      auth.error === "not_verified" ? 403 : auth.error === "no_token" ? 401 : 401;

    return NextResponse.json(
      { ok: false, error: auth.error },
      { status }
    );
  }

  return NextResponse.json({
    ok: true,
    me: auth.user,
  });
}
