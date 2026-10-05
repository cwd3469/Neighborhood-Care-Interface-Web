"use client";
// Design Ref: §2.8 — Sidebar + Header + main 레이아웃 조합
import { useEffect, useState } from "react";
import { api } from "@shared/api";
import { useAuthStore, type AuthUser } from "@features/auth-login";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

interface Props {
  children: React.ReactNode;
}

export function AppShell({ children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const setStoreLogin = useAuthStore((s) => s.setStoreLogin);

  // zustand는 메모리 상태라 새로고침 시 비워짐 → 쿠키 기준으로 다시 채운다
  useEffect(() => {
    api
      .get<AuthUser>("/api/auth/me")
      .then(setStoreLogin)
      .catch(() => {
        // 401은 axios interceptor가 refresh → 실패 시 /login 이동까지 처리
      });
  }, [setStoreLogin]);

  return (
    <div className="flex h-screen bg-gray-50">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
