// Design Ref: §5.2 — FastAPI 연결 전 mock 201 응답
// Plan SC: SC-02, SC-03 — 모달 폼 제출 성공
// TODO: FastAPI 연결 시 SERVER_API_URL + getServerApiHeaders() 프록시로 교체
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { message: "사용자가 등록되었습니다." },
    { status: 201 }
  );
}
