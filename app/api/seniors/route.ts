// Design Ref: §4.2 — SeniorCreate POST 프록시
// Plan SC: SC-04
import { NextResponse } from "next/server";
import { SERVER_API_URL, getServerApiHeaders } from "@shared/api/server";

export async function POST(request: Request) {
  const body = await request.json();
  const res = await fetch(`${SERVER_API_URL}/seniors`, {
    method: "POST",
    headers: await getServerApiHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ detail: "어르신 등록 실패" }));
    return NextResponse.json(error, { status: res.status });
  }
  return NextResponse.json(await res.json());
}
