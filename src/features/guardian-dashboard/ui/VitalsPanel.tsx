// Design Ref: §6 — 활력징후 테이블 (최근 5건)
// Plan SC: SC-04
import type { VitalObservationResponse } from "../api/vitals";

export function VitalsPanel({
  vitals,
}: {
  vitals: VitalObservationResponse[];
}) {
  return (
    <section className="rounded-lg border border-gray-200 p-5">
      <h2 className="text-base font-semibold text-gray-700 mb-3">
        활력징후 (최근 {vitals.length}건)
      </h2>
      {vitals.length === 0 ? (
        <p className="text-sm text-gray-400">기록된 활력징후가 없습니다.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-100">
              <th className="pb-2 font-medium">항목</th>
              <th className="pb-2 font-medium">수치</th>
              <th className="pb-2 font-medium">측정일시</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {vitals.map((v) => (
              <tr key={v.id} className="text-gray-700">
                <td className="py-2">{v.display_name}</td>
                <td className="py-2">
                  {v.value}{" "}
                  <span className="text-gray-400 text-xs">{v.unit}</span>
                </td>
                <td className="py-2 text-gray-400">
                  {new Date(v.observed_at).toLocaleString("ko-KR", {
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
