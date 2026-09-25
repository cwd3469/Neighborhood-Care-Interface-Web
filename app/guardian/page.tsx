// Design Ref: §5.1 — 보호자 어르신 목록 페이지
// Plan SC: SC-01
import { fetchSeniors } from "@entities/senior";
import { SeniorCard } from "@features/guardian-dashboard";

export default async function GuardianPage() {
  const seniors = await fetchSeniors();

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 bg-[#eee]">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">담당 어르신</h1>
      {seniors.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center">
          <p className="text-gray-400">담당 어르신이 없습니다.</p>
          <p className="text-sm text-gray-300 mt-1">관리자에게 문의하세요.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {seniors.map((senior) => (
            <SeniorCard key={senior.id} senior={senior} />
          ))}
        </ul>
      )}
    </main>
  );
}
