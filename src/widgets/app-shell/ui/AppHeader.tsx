"use client";
// Design Ref: §2.7 — 상단 헤더 (사용자 이름 / 로그아웃 / 햄버거)
// Plan SC: SC-01, SC-02
import { useRouter } from "next/navigation";
import { api } from "@shared/api";
import { queryClient } from "@shared/api";
import { useAuthStore } from "@features/auth-login";

interface Props {
  onToggleSidebar: () => void;
}

export function AppHeader({ onToggleSidebar }: Props) {
  const user = useAuthStore((s) => s.user);
  const setStoreLogout = useAuthStore((s) => s.setStoreLogout);

  const router = useRouter();

  async function handleLogout() {
    await api.post("/api/auth/logout");
    // Plan SC: SC-02 — 로그아웃 후 react-query 캐시 초기화
    queryClient.clear();
    setStoreLogout();
    router.push("/login");
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-4">
      {/* 햄버거 버튼 (모바일 전용, SC-06) */}
      <button
        className="rounded-md p-2 text-gray-600 hover:bg-gray-100 md:hidden"
        onClick={onToggleSidebar}
        aria-label="메뉴 열기"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* 우측: 사용자 이름 + 로그아웃 (SC-01, SC-02) */}
      <div className="ml-auto flex items-center gap-4">
        <span className="text-sm text-gray-700">{user?.name}</span>
        <button
          onClick={handleLogout}
          className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}
