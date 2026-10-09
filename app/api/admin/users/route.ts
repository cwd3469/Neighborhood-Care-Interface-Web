// Design Ref: §5.2 — FastAPI 프록시
// Plan SC: SC-02, SC-03 — 모달 폼 제출 성공
import { NextResponse } from "next/server";
import { getServerApiHeaders } from "@shared/api/server";

export async function POST(request: Request) {
  const body = await request.json();

  const res = await fetch(process.env.API_URL + "/admin/users", {
    method: "POST",
    headers: await getServerApiHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ detail: "사용자 등록 실패" }));
    return NextResponse.json(error, { status: res.status });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
