// Design Ref: §4.2 — POST 프록시, fhir_response: {} 자동 삽입
// Plan SC: SC-07, SC-09
import { NextResponse } from "next/server";
import { SERVER_API_URL, getServerApiHeaders } from "@shared/api/server";

export async function POST(request: Request) {
  const body = await request.json();

  const res = await fetch(`${SERVER_API_URL}/records`, {
    method: "POST",
    headers: await getServerApiHeaders(),
    body: JSON.stringify({ ...body, fhir_response: {} }),
  });

  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ detail: "기록 저장에 실패했습니다." }));
    return NextResponse.json(error, { status: res.status });
  }
  return NextResponse.json(await res.json());
}
