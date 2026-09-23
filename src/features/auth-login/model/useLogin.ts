'use client'
// Design Ref: §3.2 — 로그인 상태 관리 훅
// Plan SC: SC-02, SC-04
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginApi, type LoginRequest } from '../api/login'

export function useLogin() {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = async (data: LoginRequest) => {
    setIsPending(true)
    setError(null)

    const result = await loginApi(data)
    setIsPending(false)

    if (!result.ok) {
      setError(result.error ?? '로그인 실패')
      return
    }

    router.push('/dashboard')
  }

  return { login, isPending, error }
}
