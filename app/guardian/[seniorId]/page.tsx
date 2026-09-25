// Design Ref: §5.2 — 어르신 상세 대시보드
// Design Ref: §4.3 — Promise.allSettled 병렬 fetch (부분 실패 허용)
// Plan SC: SC-02 ~ SC-07
import { notFound } from "next/navigation";
import { fetchSenior } from "@entities/senior";
import {
  SeniorInfoPanel,
  VitalsPanel,
  ScheduleList,
  VisitRecordList,
  fetchSchedules,
  fetchRecords,
  fetchVitals,
} from "@features/guardian-dashboard";

export default async function SeniorDashboardPage({
  params,
}: {
  params: Promise<{ seniorId: string }>;
}) {
  const { seniorId } = await params;
  const id = Number(seniorId);
  if (isNaN(id)) notFound();

  const [seniorRes, schedulesRes, recordsRes, vitalsRes] =
    await Promise.allSettled([
      fetchSenior(id),
      fetchSchedules(id),
      fetchRecords(id),
      fetchVitals(id),
    ]);

  if (seniorRes.status === "rejected") notFound();
  const senior = seniorRes.value;
  const schedules =
    schedulesRes.status === "fulfilled" ? schedulesRes.value : [];
  const records = recordsRes.status === "fulfilled" ? recordsRes.value : [];
  const vitals = vitalsRes.status === "fulfilled" ? vitalsRes.value : [];

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        {senior.full_name}
      </h1>
      <p className="text-sm text-gray-400 mb-6">
        {senior.birth_date} · {senior.gender}
      </p>

      <div className="space-y-4">
        <SeniorInfoPanel senior={senior} />
        <VitalsPanel vitals={vitals} />
        <ScheduleList schedules={schedules} />
        <VisitRecordList records={records} />
      </div>
    </main>
  );
}
