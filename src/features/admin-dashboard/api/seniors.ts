// Design Ref: §6.2 — 어르신 CRUD Client helpers
import type { components } from '@shared/api/schema'

type SeniorCreate = components['schemas']['SeniorCreate']
type SeniorUpdate = components['schemas']['SeniorUpdate']

export async function createSenior(
  payload: SeniorCreate
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('/api/seniors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return { ok: false, error: data.detail ?? '어르신 등록 실패' }
  }
  return { ok: true }
}

export async function updateSenior(
  id: number,
  payload: SeniorUpdate
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/seniors/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return { ok: false, error: data.detail ?? '수정 실패' }
  }
  return { ok: true }
}

export async function deleteSenior(
  id: number
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/seniors/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return { ok: false, error: data.detail ?? '삭제 실패' }
  }
  return { ok: true }
}
