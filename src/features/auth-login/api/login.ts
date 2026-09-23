// Design Ref: §3.1 — Next.js Route Handler 프록시 호출
// Plan SC: SC-02, SC-03

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResult {
  ok: boolean
  error?: string
}

export async function loginApi(body: LoginRequest): Promise<LoginResult> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { detail?: string }
    return { ok: false, error: data.detail ?? '로그인에 실패했습니다.' }
  }

  return { ok: true }
}
