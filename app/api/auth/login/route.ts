// Design Ref: §3.4 — FastAPI 프록시 + httpOnly cookie 설정
// Plan SC: R-03, SC-03, SC-07
import { NextResponse } from "next/server";

interface FastApiTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  role: string; // 'guardian' | 'caregiver' | 'admin'
}

export async function POST(request: Request) {
  const body = await request.json();

  const params = new URLSearchParams();
  params.set("username", body.username);
  params.set("password", body.password);

  const res = await fetch(`${process.env.API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ detail: "인증에 실패했습니다." }));
    return NextResponse.json(error, { status: res.status });
  }

  const responseData = (await res.json()) as FastApiTokenResponse;

  const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60, // 1시간
  };

  const response = NextResponse.json({ ok: true });

  response.cookies.set(
    "access_token",
    responseData.access_token,
    COOKIE_OPTIONS,
  );
  response.cookies.set(
    "refresh_token",
    responseData.refresh_token,
    COOKIE_OPTIONS,
  );
  response.cookies.set("user_role", responseData.role, COOKIE_OPTIONS);

  return response;
}
