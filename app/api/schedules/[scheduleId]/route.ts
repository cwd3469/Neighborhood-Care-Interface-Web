// Design Ref: §4.5 — PUT + DELETE (status/route.ts 와 경로 다름, 무충돌)
// Plan SC: SC-08, SC-09
import { NextResponse } from 'next/server'
import { SERVER_API_URL, getServerApiHeaders } from '@shared/api/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  const { scheduleId } = await params
  const body = await request.json()
  const res = await fetch(`${SERVER_API_URL}/schedules/${scheduleId}`, {
    method: 'PUT',
    headers: await getServerApiHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: '일정 수정 실패' }))
    return NextResponse.json(error, { status: res.status })
  }
  return NextResponse.json(await res.json())
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  const { scheduleId } = await params
  const res = await fetch(`${SERVER_API_URL}/schedules/${scheduleId}`, {
    method: 'DELETE',
    headers: await getServerApiHeaders(),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: '일정 삭제 실패' }))
    return NextResponse.json(error, { status: res.status })
  }
  return NextResponse.json(await res.json())
}
