// Design Ref: §5.1 — Server Component 전용, getServerApiHeaders() 사용
import { SERVER_API_URL, getServerApiHeaders } from '@shared/api/server'
import type { components } from '@shared/api/schema'

type UserResponse = components['schemas']['UserResponse']

export async function fetchAdminUsers(): Promise<UserResponse[]> {
  const res = await fetch(`${SERVER_API_URL}/admin/users`, {
    headers: await getServerApiHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`fetchAdminUsers failed: ${res.status}`)
  return res.json()
}
