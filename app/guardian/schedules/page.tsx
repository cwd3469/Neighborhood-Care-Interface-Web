// Design Ref: §6.2 — guardian 방문일정 목록
import { fetchSeniors } from "@entities/senior";
import { fetchSchedules, ScheduleList } from "@features/guardian-dashboard";

export default async function GuardianSchedulesPage() {
  const seniors = await fetchSeniors();
  const schedules =
    seniors.length > 0 ? await fetchSchedules(seniors[0].id) : [];

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">방문 일정</h1>
      {schedules.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center">
          <p className="text-gray-400">방문 일정이 없습니다.</p>
        </div>
      ) : (
        <ScheduleList schedules={schedules} />
      )}
    </main>
  );
}
