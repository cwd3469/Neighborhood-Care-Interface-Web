// Design Ref: §6.3 — 일정 CRUD Client helpers
import type { components } from '@shared/api/schema'

type ScheduleCreate = components['schemas']['ScheduleCreate']
type ScheduleUpdate = components['schemas']['ScheduleUpdate']

export async function createSchedule(
  payload: ScheduleCreate
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('/api/schedules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return { ok: false, error: data.detail ?? '일정 생성 실패' }
  }
  return { ok: true }
}

export async function updateSchedule(
  id: number,
  payload: ScheduleUpdate
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/schedules/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return { ok: false, error: data.detail ?? '일정 수정 실패' }
  }
  return { ok: true }
}

export async function deleteSchedule(
  id: number
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/schedules/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return { ok: false, error: data.detail ?? '일정 삭제 실패' }
  }
  return { ok: true }
}
