// Design Ref: §6.6 — caregiver 담당 어르신 목록
import { fetchSeniors } from "@entities/senior";
import { SeniorCard } from "@features/guardian-dashboard";

export default async function CaregiverSeniorsPage() {
  const seniors = await fetchSeniors();

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">담당 어르신 목록</h1>
      {seniors.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center">
          <p className="text-gray-400">담당 어르신이 없습니다.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {seniors.map((s) => (
            <SeniorCard key={s.id} senior={s} />
          ))}
        </ul>
      )}
    </main>
  );
}
