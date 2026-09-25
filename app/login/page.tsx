// Plan SC: SC-01
import type { Metadata } from 'next'
import Link from 'next/link'
import { LoginForm } from '@features/auth-login'

export const metadata: Metadata = {
  title: '로그인 — 시니어 케어 매니저',
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-[#eee]">
      <div className="w-full max-w-sm space-y-6 bg-gray-800 dark:bg-white p-4 rounded-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">시니어 케어 매니저</h1>
          <p className="mt-1 text-sm text-gray-500">계정에 로그인하세요</p>
        </div>
        <LoginForm />
        {/* Plan SC: SC-06 — 로그인 페이지 회원가입 링크 */}
        <p className="text-center text-sm text-gray-500">
          계정이 없으신가요?{' '}
          <Link href="/signup" className="text-blue-500 hover:underline">
            회원가입
          </Link>
        </p>
      </div>
    </main>
  )
}
