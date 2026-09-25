// Design Ref: §6 — Server Component 유지, VisitRecordCard에 위임
import type { VisitRecordResponse } from "../api/records";
import { VisitRecordCard } from "./VisitRecordCard";

export function VisitRecordList({
  records,
}: {
  records: VisitRecordResponse[];
}) {
  return (
    <section className="rounded-lg border border-gray-200 p-5">
      <h2 className="text-base font-semibold text-gray-700 mb-3">
        방문 기록 ({records.length}건)
      </h2>
      {records.length === 0 ? (
        <p className="text-sm text-gray-400">방문 기록이 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {records.map((r) => (
            <VisitRecordCard key={r.id} record={r} />
          ))}
        </ul>
      )}
    </section>
  );
}
