// Design Ref: §6 — Server Component, UserTable → UserTabs 교체
// Plan SC: SC-01 — 탭 전환으로 역할별 목록 표시
import { fetchAdminUsers, UserTabs } from "@features/admin-dashboard";

export default async function AdminUsersPage() {
  const users = await fetchAdminUsers();

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">회원 관리</h1>
      <UserTabs users={users} />
    </main>
  );
}
