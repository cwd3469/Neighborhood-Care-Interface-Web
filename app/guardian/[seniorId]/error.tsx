'use client'

import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="max-w-2xl mx-auto px-4 py-8 text-center">
      <p className="text-red-500 font-medium mb-2">어르신 정보를 불러오지 못했습니다.</p>
      <p className="text-sm text-gray-400 mb-6">{error.message}</p>
      <div className="flex justify-center gap-3">
        <button
          onClick={reset}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          다시 시도
        </button>
        <Link
          href="/guardian"
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          목록으로
        </Link>
      </div>
    </main>
  )
}
