// Design Ref: §6.5 — caregiver 건강기록 목록 (Read-only)
import { fetchSeniors } from "@entities/senior";
import { fetchRecords, VisitRecordList } from "@features/guardian-dashboard";

export default async function CaregiverRecordsPage() {
  const seniors = await fetchSeniors();
  const records = seniors.length > 0 ? await fetchRecords(seniors[0].id) : [];

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">건강기록</h1>
      <p className="text-sm text-gray-500">
        건강기록 입력 기능은 추후 업데이트 예정입니다.
      </p>
      {records.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center">
          <p className="text-gray-400">건강기록이 없습니다.</p>
        </div>
      ) : (
        <VisitRecordList records={records} />
      )}
    </main>
  );
}
