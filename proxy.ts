// Design Ref: §3.5 — 보호 라우트 + role 기반 리디렉션
// Plan SC: SC-04, SC-05
// Next.js 16: middleware.ts → proxy.ts, export function proxy
import { NextResponse, type NextRequest } from "next/server";

const ROLE_ROUTES: Record<string, string> = {
  guardian: "/guardian",
  caregiver: "/caregiver",
  admin: "/admin",
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("access_token")?.value;
  // 미인증 → /login 리디렉션
  if (!token) return NextResponse.redirect(new URL("/login", request.url));

  // /dashboard → user_role 쿠키로 role별 리디렉션
  if (pathname === "/dashboard") {
    const role = request.cookies.get("user_role")?.value;
    const dest = (role && ROLE_ROUTES[role]) ?? "/login";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/guardian/:path*",
    "/caregiver/:path*",
    "/admin/:path*",
  ],
};
