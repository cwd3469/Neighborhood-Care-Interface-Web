// Design Ref: §2.4 — 로그아웃: 모든 인증 쿠키 삭제
// Plan SC: SC-02
import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("access_token");
  response.cookies.delete("refresh_token");
  response.cookies.delete("user_role");
  response.cookies.delete("user_name");
  return response;
}
