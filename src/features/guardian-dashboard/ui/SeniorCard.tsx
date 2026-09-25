// Design Ref: §6 — 목록용 카드, /guardian/{id} 링크
// Plan SC: SC-01, SC-02
import Link from "next/link";
import type { SeniorResponse } from "@entities/senior";

export function SeniorCard({ senior }: { senior: SeniorResponse }) {
  return (
    <li>
      <Link
        href={`/guardian/${senior.id}`}
        className="block rounded-lg border border-gray-200 p-4 hover:border-blue-400 hover:shadow-sm transition-all"
      >
        <p className="text-lg font-semibold text-gray-900">
          {senior.full_name}
        </p>
        <p className="mt-1 text-sm text-gray-500">
          {senior.birth_date} · {senior.gender}
        </p>
        {senior.address && (
          <p className="mt-1 text-sm text-gray-400 truncate">
            {senior.address}
          </p>
        )}
      </Link>
    </li>
  );
}
