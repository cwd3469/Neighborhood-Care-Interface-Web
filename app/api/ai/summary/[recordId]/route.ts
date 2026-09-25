// Design Ref: §4.1 — GET 프록시, 404 그대로 전달 (캐시 없음 신호)
import { NextResponse } from "next/server";
import { SERVER_API_URL, getServerApiHeaders } from "@shared/api/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ recordId: string }> },
) {
  const { recordId } = await params;
  const res = await fetch(`${SERVER_API_URL}/ai/summary/${recordId}`, {
    headers: await getServerApiHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "캐시 없음" }));
    return NextResponse.json(error, { status: res.status });
  }
  return NextResponse.json(await res.json());
}
