// Design Ref: §6.7 — admin 회원 관리
import { fetchAdminUsers, UserTable } from "@features/admin-dashboard";

export default async function AdminUsersPage() {
  const users = await fetchAdminUsers();

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">회원 관리</h1>
      <UserTable users={users} />
    </main>
  );
}
