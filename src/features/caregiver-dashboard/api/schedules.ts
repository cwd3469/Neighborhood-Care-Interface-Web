// Design Ref: §7 — Server Component fetch for caregiver's own schedules
// Plan SC: SC-01
import { SERVER_API_URL, getServerApiHeaders } from '@shared/api/server'
import type { components } from '@shared/api/schema'

type ScheduleResponse = components['schemas']['ScheduleResponse']

export async function fetchCaregiverSchedules(): Promise<ScheduleResponse[]> {
  const res = await fetch(`${SERVER_API_URL}/schedules`, {
    headers: await getServerApiHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`fetchCaregiverSchedules failed: ${res.status}`)
  return res.json()
}
