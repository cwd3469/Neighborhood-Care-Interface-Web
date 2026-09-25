// Design Ref: §4.1 — POST 프록시, body 없음 (requestBody?: never)
import { NextResponse } from "next/server";
import { SERVER_API_URL, getServerApiHeaders } from "@shared/api/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ recordId: string }> },
) {
  const { recordId } = await params;
  const res = await fetch(`${SERVER_API_URL}/ai/summarize/${recordId}`, {
    method: "POST",
    headers: await getServerApiHeaders(),
  });
  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ detail: "AI 요약 생성 실패" }));
    return NextResponse.json(error, { status: res.status });
  }
  return NextResponse.json(await res.json());
}
