// Design Ref: §6.8 — admin 일정 관리
import { fetchSeniors } from "@entities/senior";
import {
  fetchAdminUsers,
  fetchAllSchedules,
  ScheduleTable,
} from "@features/admin-dashboard";

export default async function AdminSchedulesPage() {
  const [users, seniors, schedules] = await Promise.all([
    fetchAdminUsers(),
    fetchSeniors(),
    fetchAllSchedules(),
  ]);
  const caregivers = users.filter((u) => u.role === "caregiver" && u.is_active);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">일정 관리</h1>
      <ScheduleTable
        schedules={schedules}
        seniors={seniors}
        caregivers={caregivers}
      />
    </main>
  );
}
