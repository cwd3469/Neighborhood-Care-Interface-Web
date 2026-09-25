// Design Ref: §4.2 — Server Component 전용 fetch
// Plan SC: SC-06, SC-07
import { SERVER_API_URL, getServerApiHeaders } from '@shared/api/server'
import type { components } from '@shared/api/schema'

export type VisitRecordResponse = components['schemas']['VisitRecordResponse']

export async function fetchRecords(seniorId: number): Promise<VisitRecordResponse[]> {
  const res = await fetch(
    `${SERVER_API_URL}/records?senior_id=${seniorId}`,
    { headers: await getServerApiHeaders(), cache: 'no-store' }
  )
  if (!res.ok) throw new Error(`fetchRecords failed: ${res.status}`)
  return res.json()
}
