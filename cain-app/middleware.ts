import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 인증이 필요한 경로(프리픽스 매칭)
const PROTECTED = ["/pages/airdrops", "/pages/events"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PROTECTED.some((p) => pathname.startsWith(p))) {
    const token = req.cookies.get("cain_token")?.value; // ← 너희 쿠키 키에 맞춰 수정
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/pages/login"; // 로그인/가입 페이지 경로
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/pages/:path*"], // pages 하위 전역 켜두고 내부에서 PROTECTED만 검사
};

