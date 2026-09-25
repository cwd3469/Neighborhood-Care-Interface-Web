// Design Ref: §4.2 — Server Component 전용 fetch
// Plan SC: SC-04, SC-07
import { SERVER_API_URL, getServerApiHeaders } from '@shared/api/server'
import type { components } from '@shared/api/schema'

export type VitalObservationResponse = components['schemas']['VitalObservationResponse']

export async function fetchVitals(seniorId: number, limit = 5): Promise<VitalObservationResponse[]> {
  const res = await fetch(
    `${SERVER_API_URL}/vitals/seniors/${seniorId}?limit=${limit}`,
    { headers: await getServerApiHeaders(), cache: 'no-store' }
  )
  if (!res.ok) throw new Error(`fetchVitals failed: ${res.status}`)
  return res.json()
}
