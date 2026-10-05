"use client"
// Design Ref: §3.1 — guardian 건강지표 추이 LineChart (mock)
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

const HEALTH_TREND_DATA = [
  { date: "09/29", systolic: 128, diastolic: 82 },
  { date: "09/30", systolic: 132, diastolic: 85 },
  { date: "10/01", systolic: 125, diastolic: 80 },
  { date: "10/02", systolic: 130, diastolic: 83 },
  { date: "10/03", systolic: 127, diastolic: 81 },
  { date: "10/04", systolic: 122, diastolic: 78 },
  { date: "10/05", systolic: 124, diastolic: 79 },
]

export function GuardianHealthChart() {
  return (
    <div className="rounded-lg border bg-white p-4">
      <h2 className="mb-4 text-base font-semibold text-gray-800">
        건강지표 추이 (최근 7일)
      </h2>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={HEALTH_TREND_DATA}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis domain={[60, 160]} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="systolic"
            name="수축기(mmHg)"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="diastolic"
            name="이완기(mmHg)"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
