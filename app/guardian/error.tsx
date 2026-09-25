'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="max-w-2xl mx-auto px-4 py-8 text-center">
      <p className="text-red-500 font-medium mb-2">어르신 목록을 불러오지 못했습니다.</p>
      <p className="text-sm text-gray-400 mb-6">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        다시 시도
      </button>
    </main>
  )
}
