// Design Ref: §3.4 — FastAPI 프록시 + role 고정 주입
// Plan SC: SC-05 — role 서버 고정 주입
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  // body: { name, email, password } — role 클라이언트 미수신

  const res = await fetch(process.env.API_URL + "/api/v1/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, role: "guardian" }), // role 서버 고정
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "회원가입 실패" }));
    return NextResponse.json(error, { status: res.status });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
