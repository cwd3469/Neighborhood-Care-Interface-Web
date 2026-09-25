'use client'
// Design Ref: §3.3 — 회원가입 폼 UI
// Plan SC: SC-02 — passwordConfirm 불일치 인라인 에러
import { useState } from 'react'
import { useSignup } from '../model/useSignup'

export function SignupForm() {
  const { signup, isPending, error } = useSignup()
  const [confirmError, setConfirmError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    const passwordConfirm = (form.elements.namedItem('passwordConfirm') as HTMLInputElement).value

    // Plan SC: SC-02 — passwordConfirm 프론트 유효성
    if (password !== passwordConfirm) {
      setConfirmError('비밀번호가 일치하지 않습니다.')
      return
    }
    setConfirmError(null)
    signup({ name, email, password })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium text-gray-700">
          이름
        </label>
        <input
          id="name"
          name="name"
          required
          autoComplete="name"
          placeholder="홍길동"
          className="rounded-md border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-gray-700">
          이메일
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="example@email.com"
          className="rounded-md border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-gray-700">
          비밀번호
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="8자 이상 입력"
          className="rounded-md border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="passwordConfirm" className="text-sm font-medium text-gray-700">
          비밀번호 확인
        </label>
        <input
          id="passwordConfirm"
          name="passwordConfirm"
          type="password"
          required
          autoComplete="new-password"
          placeholder="비밀번호 재입력"
          className="rounded-md border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {confirmError && (
          <p role="alert" className="text-sm text-red-600">
            {confirmError}
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? '가입 중...' : '회원가입'}
      </button>
    </form>
  )
}
