// Design Ref: §6.4 — caregiver 방문 일정 목록
import { fetchSeniors } from "@entities/senior";
import {
  fetchCaregiverSchedules,
  ScheduleCard,
} from "@features/caregiver-dashboard";

export default async function CaregiverSchedulesPage() {
  const [seniors, schedules] = await Promise.all([
    fetchSeniors(),
    fetchCaregiverSchedules(),
  ]);
  const seniorMap = Object.fromEntries(seniors.map((s) => [s.id, s.full_name]));

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">방문 일정</h1>
      {schedules.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center">
          <p className="text-gray-400">방문 일정이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((s) => (
            <ScheduleCard
              key={s.id}
              schedule={s}
              seniorName={seniorMap[s.senior_id] ?? `어르신 #${s.senior_id}`}
            />
          ))}
        </div>
      )}
    </main>
  );
}
