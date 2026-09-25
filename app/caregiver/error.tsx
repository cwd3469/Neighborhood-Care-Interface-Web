'use client'

export default function CaregiverError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h2 className="text-lg font-semibold text-red-600">오류가 발생했습니다</h2>
      <p className="mt-2 text-sm text-gray-600">{error.message}</p>
      <button
        onClick={reset}
        className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        다시 시도
      </button>
    </main>
  )
}
