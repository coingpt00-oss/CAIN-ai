// src/app/api/community/upload-image/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireUserFromRequest } from "@/lib/user-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "community-images";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function json(status: number, body: any) {
  return NextResponse.json(body, { status });
}

function authStatus(error?: string | null) {
  if (error === "not_verified") return 403;
  if (error === "no_token") return 401;
  if (error === "device_not_found") return 401;
  if (error === "device_revoked") return 401;
  return 401;
}

function safeFileName(value: string) {
  return String(value || "image")
    .trim()
    .replace(/[^\w가-힣.-]+/g, "_")
    .slice(0, 80);
}

// POST /api/community/upload-image
// form-data: file
export async function POST(req: NextRequest) {
  try {
    const auth = await requireUserFromRequest(req);

    if (!auth.ok || !auth.user) {
      return json(authStatus(auth.error), {
        ok: false,
        error: auth.error || "unauthorized",
      });
    }

    const formData = await req.formData().catch(() => null);
    const file = formData?.get("file");

    if (!(file instanceof File)) {
      return json(400, {
        ok: false,
        error: "missing_file",
      });
    }

    if (file.size <= 0) {
      return json(400, {
        ok: false,
        error: "empty_file",
      });
    }

    if (file.size > MAX_FILE_SIZE) {
      return json(400, {
        ok: false,
        error: "file_too_large",
        max_bytes: MAX_FILE_SIZE,
      });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return json(400, {
        ok: false,
        error: "unsupported_file_type",
        allowed: Array.from(ALLOWED_MIME_TYPES),
      });
    }

    const ext = EXT_BY_MIME[file.type] || "jpg";
    const uid = auth.user.uid;
    const originalName = safeFileName(file.name || `image.${ext}`);
    const baseName = originalName.toLowerCase().endsWith(`.${ext}`)
      ? originalName.slice(0, -(ext.length + 1))
      : originalName;
    const key = `${uid}/${Date.now()}-${crypto.randomUUID()}-${baseName}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(key, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[community/upload-image] upload failed:", uploadError.message);
      return json(500, {
        ok: false,
        error: "image_upload_failed",
        detail: uploadError.message,
      });
    }

    const { data: publicData } = supabaseAdmin.storage
      .from(BUCKET)
      .getPublicUrl(key);

    if (!publicData?.publicUrl) {
      return json(500, {
        ok: false,
        error: "public_url_failed",
      });
    }

    return json(201, {
      ok: true,
      url: publicData.publicUrl,
      publicUrl: publicData.publicUrl,
      path: key,
      size: file.size,
      mime_type: file.type,
    });
  } catch (e: any) {
    console.error("[community/upload-image] fatal:", e?.message || e);
    return json(500, {
      ok: false,
      error: "internal_error",
      detail: e?.message || String(e),
    });
  }
}