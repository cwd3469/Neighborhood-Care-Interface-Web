// Design Ref: §4.3 — PUT + DELETE 하나의 파일 (Next.js App Router 표준)
// Plan SC: SC-05, SC-06
import { NextResponse } from "next/server";
import { SERVER_API_URL, getServerApiHeaders } from "@shared/api/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ seniorId: string }> },
) {
  const { seniorId } = await params;
  const body = await request.json();
  const res = await fetch(`${SERVER_API_URL}/seniors/${seniorId}`, {
    method: "PUT",
    headers: await getServerApiHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "수정 실패" }));
    return NextResponse.json(error, { status: res.status });
  }
  return NextResponse.json(await res.json());
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ seniorId: string }> },
) {
  const { seniorId } = await params;
  const res = await fetch(`${SERVER_API_URL}/seniors/${seniorId}`, {
    method: "DELETE",
    headers: await getServerApiHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "삭제 실패" }));
    return NextResponse.json(error, { status: res.status });
  }
  return NextResponse.json(await res.json());
}
