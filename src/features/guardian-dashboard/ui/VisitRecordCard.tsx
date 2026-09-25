'use client'
// Design Ref: §5 — 'use client' VisitRecordCard, SummaryState 4-state
import { useState } from 'react'
import type { components } from '@shared/api/schema'
import type { VisitRecordResponse } from '../api/records'
import { getSummary, triggerSummary } from '../api/ai'

type AiSummaryResponse = components['schemas']['AiSummaryResponse']
type SummaryState = 'idle' | 'loading' | 'done' | 'error'

interface Props {
  record: VisitRecordResponse
}

export function VisitRecordCard({ record }: Props) {
  const [state, setState] = useState<SummaryState>('idle')
  const [summary, setSummary] = useState<AiSummaryResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Plan SC: SC-02, SC-03, SC-04 — 캐시-first 핸들러
  async function handleSummarize() {
    setState('loading')
    setError(null)
    try {
      const cached = await getSummary(record.id)
      if (cached) {
        setSummary(cached)
        setState('done')
        return
      }
      const result = await triggerSummary(record.id)
      if (result.ok && result.data) {
        setSummary(result.data)
        setState('done')
      } else {
        setError(result.error ?? '요약 생성 실패')
        setState('error')
      }
    } catch {
      setError('네트워크 오류가 발생했습니다')
      setState('error')
    }
  }

  return (
    <li className="text-sm border-b border-gray-50 pb-3 last:border-0 last:pb-0">
      {/* 날짜 */}
      <p className="text-gray-400 text-xs mb-1">
        {new Date(record.recorded_at).toLocaleString('ko-KR', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit',
        })}
      </p>

      {/* visit_notes */}
      {record.visit_notes ? (
        <p className="text-gray-700 leading-relaxed">{record.visit_notes}</p>
      ) : (
        <p className="text-gray-400 italic">기록 없음</p>
      )}

      {/* Plan SC: SC-01 — AI 요약 버튼 (visit_notes 있을 때만) */}
      {record.visit_notes && state === 'idle' && (
        <button
          onClick={handleSummarize}
          className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
        >
          AI 요약 보기
        </button>
      )}

      {/* Plan SC: SC-04 — 로딩 스피너 */}
      {state === 'loading' && (
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          요약 생성 중...
        </div>
      )}

      {/* Plan SC: SC-05, SC-06 — 요약 + anomaly_flags 배지 */}
      {state === 'done' && summary && (
        <div className="mt-2 rounded-md border border-blue-100 bg-blue-50 p-3">
          <p className="text-xs font-medium text-blue-700 mb-1">AI 요약</p>
          <p className="text-xs text-gray-700 leading-relaxed">{summary.summary}</p>
          {summary.anomaly_flags && summary.anomaly_flags.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-red-600 mb-1">⚠ 이상징후</p>
              <div className="flex flex-wrap gap-1">
                {summary.anomaly_flags.map((flag, i) => (
                  <span
                    key={i}
                    className="inline-block rounded px-2 py-0.5 text-xs bg-red-100 text-red-700"
                  >
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Plan SC: SC-07 — 에러 메시지 + 재시도 */}
      {state === 'error' && (
        <div className="mt-2 flex items-center gap-2">
          <p className="text-xs text-red-500">{error}</p>
          <button
            onClick={handleSummarize}
            className="text-xs text-red-600 hover:text-red-800 underline"
          >
            재시도
          </button>
        </div>
      )}
    </li>
  )
}
