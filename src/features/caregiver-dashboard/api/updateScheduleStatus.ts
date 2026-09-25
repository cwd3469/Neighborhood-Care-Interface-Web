// Design Ref: §5.1 — Client Component에서 호출
import type { components } from '@shared/api/schema'

type ScheduleStatus = components['schemas']['ScheduleStatus']

export async function updateScheduleStatus(
  scheduleId: number,
  status: ScheduleStatus
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/schedules/${scheduleId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return { ok: false, error: data.detail ?? '상태 변경에 실패했습니다.' }
  }
  return { ok: true }
}
