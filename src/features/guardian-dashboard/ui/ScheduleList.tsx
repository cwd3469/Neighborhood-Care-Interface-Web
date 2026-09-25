// Design Ref: §6 — 방문 일정 목록, status=scheduled 필터
// Plan SC: SC-05
// Plan Known Constraint: caregiver_id만 표시 (API에 caregiver_name 없음)
// TODO: 백엔드 ScheduleResponse에 caregiver_name 추가되면 교체
import type { ScheduleResponse } from "../api/schedules";

const STATUS_LABEL: Record<string, string> = {
  scheduled: "예정",
  in_progress: "진행중",
  completed: "완료",
  cancelled: "취소",
};

export function ScheduleList({ schedules }: { schedules: ScheduleResponse[] }) {
  const upcoming = schedules.filter((s) => s.status === "scheduled");

  return (
    <section className="rounded-lg border border-gray-200 p-5">
      <h2 className="text-base font-semibold text-gray-700 mb-3">
        예정 방문 일정 ({upcoming.length}건)
      </h2>
      {upcoming.length === 0 ? (
        <p className="text-sm text-gray-400">예정된 방문이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {upcoming.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0"
            >
              <div>
                <span className="font-medium text-gray-800">
                  {s.scheduled_date}
                </span>
                <span className="text-gray-400 ml-2">
                  {s.start_time.slice(0, 5)} ~ {s.end_time.slice(0, 5)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-gray-400 text-xs">
                  요양사 #{s.caregiver_id}
                </span>
                <span className="ml-2 inline-block px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-600">
                  {STATUS_LABEL[s.status] ?? s.status}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
