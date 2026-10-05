// Design Ref: §5.3 — admin 대시보드: 역할별 회원 차트 + 요약 카드
import { fetchSeniors } from "@entities/senior";
import {
  AdminUserChart,
  fetchAdminUsers,
  fetchAllSchedules,
} from "@features/admin-dashboard";

export default async function AdminPage() {
  const [users, seniors, schedules] = await Promise.all([
    fetchAdminUsers(),
    fetchSeniors(),
    fetchAllSchedules(),
  ]);

  const chartData = {
    guardian: users.filter((u) => u.role === "guardian").length,
    caregiver: users.filter((u) => u.role === "caregiver").length,
    admin: users.filter((u) => u.role === "admin").length,
  };

  const recentUsers = [...users].sort((a, b) => b.id - a.id).slice(0, 5);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">관리자 대시보드</h1>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="전체 회원" value={users.length} />
        <StatCard label="담당 어르신" value={seniors.length} />
        <StatCard label="전체 일정" value={schedules.length} />
      </div>

      {/* 역할별 회원 차트 */}
      <AdminUserChart {...chartData} />

      {/* 최근 가입 회원 */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-800">최근 가입 회원</h2>
        <ul className="divide-y rounded-lg border bg-white">
          {recentUsers.map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              <span className="font-medium text-gray-900">
                {u.full_name ?? u.username}
              </span>
              <span className="text-gray-500">{u.role}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-white p-4 text-center">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}
