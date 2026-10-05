"use client"
// Design Ref: §3.3 — admin 역할별 회원수 PieChart
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface Props {
  guardian: number
  caregiver: number
  admin: number
}

const ROLE_COLORS = {
  guardian: "#3b82f6",
  caregiver: "#10b981",
  admin: "#f59e0b",
}

export function AdminUserChart({ guardian, caregiver, admin }: Props) {
  const data = [
    { name: "보호자", value: guardian, colorKey: "guardian" },
    { name: "케어기버", value: caregiver, colorKey: "caregiver" },
    { name: "관리자", value: admin, colorKey: "admin" },
  ] as const

  return (
    <div className="rounded-lg border bg-white p-4">
      <h2 className="mb-4 text-base font-semibold text-gray-800">
        역할별 회원 현황
      </h2>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            dataKey="value"
            label={({ name, value }) => `${name}: ${value}`}
          >
            {data.map((entry) => (
              <Cell
                key={entry.colorKey}
                fill={ROLE_COLORS[entry.colorKey]}
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
