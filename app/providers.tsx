"use client";
// Design Ref: §4.6 — QueryClientProvider 래핑
// Design Ref: §4.5 (auth-login-v2) — AuthProvider 추가
// Design Ref: §2.3 (api-client) — setNavigateToLogin router setter 등록
// Plan SC: R-06, SC-05
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient, setNavigateToLogin } from "@shared/api";
import { AuthProvider } from "@features/auth-login";

interface Props {
  children: React.ReactNode;
}

export function Providers({ children }: Props) {
  const router = useRouter();

  useEffect(() => {
    // axios interceptor에서 useRouter 직접 호출 불가 → setter로 주입
    setNavigateToLogin(() => router.push("/login"));
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
