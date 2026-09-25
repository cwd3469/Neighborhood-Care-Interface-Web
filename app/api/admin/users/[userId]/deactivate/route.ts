// Design Ref: §4.1 — body 없는 PATCH (deactivate는 request body 불필요)
// Plan SC: SC-03
import { NextResponse } from 'next/server'
import { SERVER_API_URL, getServerApiHeaders } from '@shared/api/server'

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  const res = await fetch(`${SERVER_API_URL}/admin/users/${userId}/deactivate`, {
    method: 'PATCH',
    headers: await getServerApiHeaders(),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: '비활성화 실패' }))
    return NextResponse.json(error, { status: res.status })
  }
  return NextResponse.json(await res.json())
}
