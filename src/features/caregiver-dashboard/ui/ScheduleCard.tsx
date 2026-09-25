'use client'
// Design Ref: §6 — 단일 Client Component: 상태 버튼 + 기록 폼 통합
// Plan SC: SC-02, SC-03, SC-04, SC-05, SC-06, SC-07, SC-08
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { components } from '@shared/api/schema'
import { updateScheduleStatus } from '../api/updateScheduleStatus'
import { createRecord } from '../api/createRecord'

type ScheduleResponse = components['schemas']['ScheduleResponse']
type ScheduleStatus = components['schemas']['ScheduleStatus']

interface Props {
  schedule: ScheduleResponse
  seniorName: string
}

const NEXT_STATUS: Record<string, ScheduleStatus | null> = {
  scheduled:   'in_progress',
  in_progress: 'completed',
  completed:   null,
  cancelled:   null,
}

const STATUS_LABEL: Record<string, string> = {
  scheduled:   '예정',
  in_progress: '진행중',
  completed:   '완료',
  cancelled:   '취소',
}

const BUTTON_LABEL: Record<string, string> = {
  scheduled:   '방문 시작',
  in_progress: '방문 완료',
}

export function ScheduleCard({ schedule, seniorName }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState<ScheduleStatus>(schedule.status)
  const [isPending, setIsPending] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [visitNotes, setVisitNotes] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Plan SC: SC-03, SC-04, SC-05
  async function handleStatusChange() {
    const next = NEXT_STATUS[status]
    if (!next || isPending) return
    setIsPending(true)
    const result = await updateScheduleStatus(schedule.id, next)
    setIsPending(false)
    if (result.ok) {
      setStatus(next)
      router.refresh()
    }
  }

  // Plan SC: SC-07
  async function handleRecordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isSubmitting) return
    setFormError(null)
    setIsSubmitting(true)
    const result = await createRecord({
      senior_id: schedule.senior_id,
      schedule_id: schedule.id,
      visit_notes: visitNotes,
    })
    setIsSubmitting(false)
    if (result.ok) {
      setSubmitted(true)
      setShowForm(false)
    } else {
      setFormError(result.error ?? '기록 저장에 실패했습니다.')
    }
  }

  const nextStatus = NEXT_STATUS[status]
  // Plan SC: SC-06
  const canRecord = (status === 'in_progress' || status === 'completed') && !submitted

  return (
    <div className="rounded-lg border border-gray-200 p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="font-semibold text-gray-900">{seniorName}</p>
          <p className="text-sm text-gray-600">{schedule.scheduled_date}</p>
          {schedule.start_time && schedule.end_time && (
            <p className="text-sm text-gray-600">
              {schedule.start_time} ~ {schedule.end_time}
            </p>
          )}
        </div>
        <span className="text-sm font-medium text-gray-700">
          {STATUS_LABEL[status] ?? status}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {nextStatus && (
          <button
            onClick={handleStatusChange}
            disabled={isPending}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white
                       hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? '처리중...' : BUTTON_LABEL[status]}
          </button>
        )}

        {canRecord && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium
                       text-gray-700 hover:bg-gray-50"
          >
            기록 작성
          </button>
        )}
      </div>

      {submitted && (
        <p className="text-sm text-green-600">기록이 저장되었습니다.</p>
      )}

      {showForm && (
        <form onSubmit={handleRecordSubmit} className="space-y-2">
          <textarea
            value={visitNotes}
            onChange={(e) => setVisitNotes(e.target.value)}
            placeholder="방문 기록을 입력하세요"
            required
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {formError && (
            <p className="text-sm text-red-600">{formError}</p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white
                         hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '저장중...' : '저장'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormError(null) }}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium
                         text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
