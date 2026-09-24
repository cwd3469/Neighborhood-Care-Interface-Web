// Design Ref: §8 — Promise.all 초기 로드 + caregivers 필터
// Plan SC: SC-01
import { fetchSeniors } from '@entities/senior'
import {
  fetchAdminUsers,
  fetchAllSchedules,
  UserTable,
  SeniorTable,
  ScheduleTable,
} from '@features/admin-dashboard'

export default async function AdminPage() {
  const [users, seniors, schedules] = await Promise.all([
    fetchAdminUsers(),
    fetchSeniors(),
    fetchAllSchedules(),
  ])

  // Plan Known Constraint: ScheduleCreate에 caregiver_id 필수 → 활성 caregiver 사전 필터
  const caregivers = users.filter(u => u.role === 'caregiver' && u.is_active)

  return (
    <main className="mx-auto max-w-5xl space-y-10 p-6">
      <h1 className="text-2xl font-bold text-gray-900">관리자 대시보드</h1>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-800">사용자 관리</h2>
        <UserTable users={users} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-800">어르신 관리</h2>
        <SeniorTable seniors={seniors} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-800">일정 관리</h2>
        <ScheduleTable
          schedules={schedules}
          seniors={seniors}
          caregivers={caregivers}
        />
      </section>
    </main>
  )
}
