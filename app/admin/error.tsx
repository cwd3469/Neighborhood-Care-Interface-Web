"use client";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminError({ error, reset }: Props) {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <h2 className="text-lg font-semibold text-red-700">
          데이터를 불러오지 못했습니다
        </h2>
        <p className="mt-1 text-sm text-red-500">{error.message}</p>
        <button
          onClick={reset}
          className="mt-4 rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
        >
          다시 시도
        </button>
      </div>
    </main>
  );
}
