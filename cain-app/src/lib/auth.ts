// src/lib/auth.ts
import { NextResponse } from "next/server";

// ================================
// Client helpers
// ================================
export function getOrCreateDeviceId() {
  if (typeof window === "undefined") return null;
  const key = "cain_device_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

// ================================
// Server helpers
// ================================
export function setAuthCookie(res: NextResponse, token: string) {
  // ✅ httpOnly 쿠키로 토큰 저장 (보안)
  res.cookies.set("cain_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30일
  });
}

export function clearAuthCookie(res: NextResponse) {
  res.cookies.set("cain_token", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
}
