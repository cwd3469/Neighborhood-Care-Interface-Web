'use client'
// Design Ref: §7.1 — 비활성화 전용 (읽기 + 단일 액션)
// Plan SC: SC-02, SC-03
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { components } from '@shared/api/schema'
import { deactivateUser } from '../api/deactivateUser'

type UserResponse = components['schemas']['UserResponse']

interface Props {
  users: UserResponse[]
}

const ROLE_LABEL: Record<string, string> = {
  admin: '관리자',
  caregiver: '요양사',
  guardian: '보호자',
}

export function UserTable({ users }: Props) {
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set())
  const router = useRouter()

  async function handleDeactivate(userId: number) {
    setPendingIds(prev => new Set(prev).add(userId))
    const result = await deactivateUser(userId)
    setPendingIds(prev => {
      const s = new Set(prev)
      s.delete(userId)
      return s
    })
    if (result.ok) router.refresh()
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">아이디</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">역할</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">이름</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">상태</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {users.map(user => (
            <tr key={user.id}>
              <td className="px-4 py-3 text-sm text-gray-900">{user.username}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{ROLE_LABEL[user.role] ?? user.role}</td>
              <td className="px-4 py-3 text-sm text-gray-900">{user.full_name ?? '-'}</td>
              <td className="px-4 py-3 text-sm">
                {user.is_active ? (
                  <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    활성
                  </span>
                ) : (
                  <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                    비활성
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                {user.is_active && (
                  <button
                    onClick={() => handleDeactivate(user.id)}
                    disabled={pendingIds.has(user.id)}
                    className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    {pendingIds.has(user.id) ? '처리 중...' : '비활성화'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
