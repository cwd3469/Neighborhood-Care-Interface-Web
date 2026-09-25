// Design Ref: §4.4 — ScheduleCreate POST 프록시
// Plan SC: SC-07
// 주의: app/api/schedules/[scheduleId]/status/route.ts (caregiver) 와 경로 다름 — 무충돌
import { NextResponse } from "next/server";
import { SERVER_API_URL, getServerApiHeaders } from "@shared/api/server";

export async function POST(request: Request) {
  const body = await request.json();
  const res = await fetch(`${SERVER_API_URL}/schedules`, {
    method: "POST",
    headers: await getServerApiHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "일정 생성 실패" }));
    return NextResponse.json(error, { status: res.status });
  }
  return NextResponse.json(await res.json());
}
