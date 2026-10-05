// Design Ref: §5.2 — caregiver 대시보드: 방문 현황 차트 + 오늘 일정 요약
import { fetchSeniors } from "@entities/senior";
import {
  CaregiverScheduleChart,
  fetchCaregiverSchedules,
  ScheduleCard,
} from "@features/caregiver-dashboard";

export default async function CaregiverPage() {
  const [seniors, schedules] = await Promise.all([
    fetchSeniors(),
    fetchCaregiverSchedules(),
  ]);

  const seniorMap = Object.fromEntries(seniors.map((s) => [s.id, s.full_name]));

  // Plan SC: SC-02 — 상태별 집계
  const stats = {
    scheduled: schedules.filter((s) => s.status === "scheduled").length,
    in_progress: schedules.filter((s) => s.status === "in_progress").length,
    completed: schedules.filter((s) => s.status === "completed").length,
    cancelled: schedules.filter((s) => s.status === "cancelled").length,
  };

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">케어기버 대시보드</h1>

      {/* 방문 현황 차트 */}
      <CaregiverScheduleChart {...stats} />

      {/* 오늘 방문 일정 요약 */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-800">오늘의 방문 일정</h2>
        {schedules.length === 0 ? (
          <p className="text-gray-500">오늘 예정된 방문 일정이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {schedules.slice(0, 5).map((s) => (
              <ScheduleCard
                key={s.id}
                schedule={s}
                seniorName={seniorMap[s.senior_id] ?? `어르신 #${s.senior_id}`}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
