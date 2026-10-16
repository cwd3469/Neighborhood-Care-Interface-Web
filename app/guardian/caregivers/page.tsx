// Design Ref: §6.3 — guardian 케어기버 목록 (app layer에서 admin-dashboard import — FSD 허용)
import { fetchAdminUsers } from "@features/admin-dashboard";

export default async function GuardianCaregiversPage() {
  const users = await fetchAdminUsers();
  const caregivers = users.filter((u) => u.role === "caregiver" && u.is_active);

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">케어기버 목록</h1>
      {caregivers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center">
          <p className="text-gray-400">배정된 케어기버가 없습니다.</p>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border bg-white">
          {caregivers.map((c) => (
            <li key={c.id} className="px-4 py-3">
              <p className="font-medium text-gray-900">
                {c.full_name ?? c.username}
              </p>
              <p className="text-sm text-gray-500">{c.phone ?? "-"}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
