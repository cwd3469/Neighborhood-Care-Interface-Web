// Design Ref: §3.2 — Node.js Runtime에서 FastAPI /refresh 호출
// Plan SC: SC-01, SC-03, SC-04
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

interface FastApiRefreshResponse {
  access_token: string;
  token_type: string;
}

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: "No refresh token" }, { status: 401 });
  }

  const res = await fetch(`${process.env.API_URL}/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${refreshToken}`,
    },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Refresh failed" }, { status: 401 });
  }

  const data = (await res.json()) as FastApiRefreshResponse;

  const response = NextResponse.json({ ok: true });
  response.cookies.set("access_token", data.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60, // 1시간
  });
  return response;
}
