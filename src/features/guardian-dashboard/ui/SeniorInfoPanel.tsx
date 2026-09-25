// Design Ref: §6 — 어르신 기본 정보 패널
// Plan SC: SC-03
import type { SeniorResponse } from "@entities/senior";

export function SeniorInfoPanel({ senior }: { senior: SeniorResponse }) {
  const rows: { label: string; value: string | null | undefined }[] = [
    { label: "생년월일", value: senior.birth_date },
    { label: "성별", value: senior.gender },
    { label: "주소", value: senior.address },
    { label: "연락처", value: senior.phone },
    { label: "특이사항", value: senior.medical_notes },
  ];

  return (
    <section className="rounded-lg border border-gray-200 p-5">
      <h2 className="text-base font-semibold text-gray-700 mb-3">기본 정보</h2>
      <dl className="space-y-2">
        {rows.map(({ label, value }) =>
          value ? (
            <div key={label} className="flex gap-3 text-sm">
              <dt className="w-20 shrink-0 text-gray-400">{label}</dt>
              <dd className="text-gray-800">{value}</dd>
            </div>
          ) : null,
        )}
      </dl>
    </section>
  );
}
