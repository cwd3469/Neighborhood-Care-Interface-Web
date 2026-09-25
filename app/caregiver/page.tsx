// Design Ref: §7 — 초기 데이터 Server Component fetch + senior 매핑
// Plan SC: SC-01, SC-08
import { fetchSeniors } from "@entities/senior";
import {
  fetchCaregiverSchedules,
  ScheduleCard,
} from "@features/caregiver-dashboard";
import { SeniorCard } from "@features/guardian-dashboard";

export default async function CaregiverPage() {
  const [seniors, schedules] = await Promise.all([
    fetchSeniors(),
    fetchCaregiverSchedules(),
  ]);

  // Plan SC: Known Constraint — senior_name 없음, senior_id → name 매핑
  const seniorMap = Object.fromEntries(seniors.map((s) => [s.id, s.full_name]));

  return (
    <main className="mx-auto max-w-2xl space-y-8 p-6 bg-[#eee]">
      <h1 className="text-2xl font-bold text-gray-900">오늘의 방문 일정</h1>

      {schedules.length === 0 ? (
        <p className="text-gray-500">오늘 예정된 방문 일정이 없습니다.</p>
      ) : (
        <div className="space-y-4">
          {schedules.map((s) => (
            <ScheduleCard
              key={s.id}
              schedule={s}
              seniorName={seniorMap[s.senior_id] ?? `어르신 #${s.senior_id}`}
            />
          ))}
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">담당 어르신</h2>
        {seniors.length === 0 ? (
          <p className="text-gray-500">담당 어르신이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {seniors.map((s) => (
              <SeniorCard key={s.id} senior={s} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
