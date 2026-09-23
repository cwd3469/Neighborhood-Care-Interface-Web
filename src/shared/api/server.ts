// Design Ref: §3.6 — Server Component용 인증 헤더 유틸
// Plan SC: R-05, SC-06
// ⚠️ 이 파일은 Server Component / Route Handler에서만 import 가능
//    'use client' 컴포넌트에서 사용하면 빌드 오류 발생
import { cookies } from 'next/headers'

export const SERVER_API_URL = process.env.API_URL ?? ''

/**
 * Server Component에서 FastAPI를 호출할 때 사용하는 인증 헤더.
 *
 * @example
 * // app/guardian/page.tsx (Server Component)
 * const res = await fetch(SERVER_API_URL + '/patients', {
 *   headers: await getServerApiHeaders(),
 * })
 */
export async function getServerApiHeaders(): Promise<HeadersInit> {
  // Next.js 16: cookies() is async
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}
