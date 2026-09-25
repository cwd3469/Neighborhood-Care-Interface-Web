// Design Ref: §6.1 — body 없는 PATCH, caregiver 패턴과 동일한 반환 타입
export async function deactivateUser(
  userId: number
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/admin/users/${userId}/deactivate`, {
    method: 'PATCH',
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return { ok: false, error: data.detail ?? '비활성화 실패' }
  }
  return { ok: true }
}
