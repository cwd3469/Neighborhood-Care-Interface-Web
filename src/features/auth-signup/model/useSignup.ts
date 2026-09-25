'use client'
// Design Ref: §3.2 — 회원가입 상태 관리 훅
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signupApi, type SignupRequest } from '../api/signup'

export function useSignup() {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signup = async (data: SignupRequest) => {
    setIsPending(true)
    setError(null)
    const result = await signupApi(data)
    setIsPending(false)

    if (!result.ok) {
      setError(result.error ?? '회원가입 실패')
      return
    }
    router.push('/login')
  }

  return { signup, isPending, error }
}
