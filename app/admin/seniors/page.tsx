// Design Ref: §6.9 — admin 어르신 관리
import { fetchSeniors } from "@entities/senior";
import { SeniorTable } from "@features/admin-dashboard";

export default async function AdminSeniorsPage() {
  const seniors = await fetchSeniors();

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">어르신 관리</h1>
      <SeniorTable seniors={seniors} />
    </main>
  );
}
