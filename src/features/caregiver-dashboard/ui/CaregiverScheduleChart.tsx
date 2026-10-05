"use client"
// Design Ref: §3.2 — caregiver 방문 현황 BarChart
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface Props {
  scheduled: number
  in_progress: number
  completed: number
  cancelled: number
}

const STATUS_CONFIG = [
  { key: "scheduled", label: "예정", color: "#3b82f6" },
  { key: "in_progress", label: "진행중", color: "#f59e0b" },
  { key: "completed", label: "완료", color: "#10b981" },
  { key: "cancelled", label: "취소", color: "#ef4444" },
] as const

export function CaregiverScheduleChart({
  scheduled,
  in_progress,
  completed,
  cancelled,
}: Props) {
  const data = [
    { status: "예정", count: scheduled, color: "#3b82f6" },
    { status: "진행중", count: in_progress, color: "#f59e0b" },
    { status: "완료", count: completed, color: "#10b981" },
    { status: "취소", count: cancelled, color: "#ef4444" },
  ]

  return (
    <div className="rounded-lg border bg-white p-4">
      <h2 className="mb-4 text-base font-semibold text-gray-800">
        방문 일정 현황
      </h2>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="status" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="count" name="건수">
            {data.map((entry) => (
              <Cell key={entry.status} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
