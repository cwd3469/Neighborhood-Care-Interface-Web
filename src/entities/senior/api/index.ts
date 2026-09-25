// Design Ref: §4.1 — Server Component 전용 fetch
// Plan SC: SC-07 (Authorization 헤더)
import { SERVER_API_URL, getServerApiHeaders } from '@shared/api/server'
import type { SeniorResponse } from '../model/types'

export async function fetchSeniors(): Promise<SeniorResponse[]> {
  const res = await fetch(`${SERVER_API_URL}/seniors`, {
    headers: await getServerApiHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`fetchSeniors failed: ${res.status}`)
  return res.json()
}

export async function fetchSenior(seniorId: number): Promise<SeniorResponse> {
  const res = await fetch(`${SERVER_API_URL}/seniors/${seniorId}`, {
    headers: await getServerApiHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`fetchSenior failed: ${res.status}`)
  return res.json()
}
