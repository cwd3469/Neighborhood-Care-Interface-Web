// Design Ref: §4.1 — httpOnly cookie에서 인증 상태 읽기
// Plan SC: SC-04
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  const role = cookieStore.get('user_role')?.value

  if (!token || !role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ role })
}
