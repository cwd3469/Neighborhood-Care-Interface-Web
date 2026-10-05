// Design Ref: §5.1 — guardian 대시보드: 건강지표 차트 + 어르신 목록
import { fetchSeniors } from "@entities/senior";
import { GuardianHealthChart, SeniorCard } from "@features/guardian-dashboard";

export default async function GuardianPage() {
  const seniors = await fetchSeniors();

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">보호자 대시보드</h1>

      {/* 건강지표 차트 */}
      <GuardianHealthChart />

      {/* 담당 어르신 */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-800">
          담당 어르신 ({seniors.length}명)
        </h2>
        {seniors.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center">
            <p className="text-gray-400">담당 어르신이 없습니다.</p>
            <p className="mt-1 text-sm text-gray-300">관리자에게 문의하세요.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {seniors.map((senior) => (
              <SeniorCard key={senior.id} senior={senior} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
