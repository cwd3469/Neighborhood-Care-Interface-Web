// Design Ref: §4.1 — auth-login 프록시 패턴 재사용
// Plan SC: SC-03, SC-04, SC-09
import { NextResponse } from "next/server";
import { SERVER_API_URL, getServerApiHeaders } from "@shared/api/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ scheduleId: string }> },
) {
  const { scheduleId } = await params;
  const body = await request.json();

  const res = await fetch(`${SERVER_API_URL}/schedules/${scheduleId}/status`, {
    method: "PATCH",
    headers: await getServerApiHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ detail: "상태 변경에 실패했습니다." }));
    return NextResponse.json(error, { status: res.status });
  }
  return NextResponse.json(await res.json());
}
