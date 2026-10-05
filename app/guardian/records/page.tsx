// Design Ref: §6.1 — guardian 건강기록 조회
import { fetchSeniors } from "@entities/senior";
import { fetchRecords, VisitRecordList } from "@features/guardian-dashboard";

export default async function GuardianRecordsPage() {
  const seniors = await fetchSeniors();
  const records = seniors.length > 0 ? await fetchRecords(seniors[0].id) : [];

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">건강기록 조회</h1>
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
