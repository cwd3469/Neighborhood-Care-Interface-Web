// Design Ref: §3.3 — silent refresh + role 기반 리디렉션
// Plan SC: SC-01, SC-02, SC-04
// Next.js 16: middleware.ts → proxy.ts, export function proxy
import { NextResponse, type NextRequest } from "next/server";

// Plan SC: SC-01 — JWT expiry proactive check (Edge Runtime, 라이브러리 없이)
function isJwtExpired(token: string): boolean {
  try {
    const payload = token.split(".")[1];
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const decoded = JSON.parse(atob(padded)) as { exp?: number };
    if (!decoded.exp) return false;
    // 10초 클록 스큐 버퍼: 서버/클라이언트 시간 차이 흡수
    return decoded.exp * 1000 < Date.now() - 10_000;
  } catch {
    return true; // decode 실패 → 만료로 간주 → refresh 시도 (안전 방향)
  }
}

const ROLE_ROUTES: Record<string, string> = {
  guardian: "/guardian",
  caregiver: "/caregiver",
  admin: "/admin",
};

function getRoleRedirect(request: NextRequest): NextResponse {
  const role = request.cookies.get("user_role")?.value;
  const dest = (role && ROLE_ROUTES[role]) ?? "/login";
  return NextResponse.redirect(new URL(dest, request.url));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;

  if (!accessToken || isJwtExpired(accessToken)) {
    // refresh_token 없음 → /login
    if (!refreshToken) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // refresh_token으로 갱신 시도
    const refreshUrl = new URL("/api/auth/refresh", request.url);
    const refreshRes = await fetch(refreshUrl.toString(), {
      method: "POST",
      headers: {
        Cookie: request.headers.get("cookie") ?? "",
      },
    });

    if (!refreshRes.ok) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // 갱신 성공: 목적지 결정
    const response =
      pathname === "/dashboard"
        ? getRoleRedirect(request)
        : NextResponse.next();

    // 새 access_token 쿠키 전파
    const setCookie = refreshRes.headers.get("set-cookie");
    if (setCookie) {
      response.headers.set("set-cookie", setCookie);
    }

    return response;
  }

  // access_token 있음 — /dashboard role redirect
  if (pathname === "/dashboard") {
    return getRoleRedirect(request);
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
