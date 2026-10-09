"use client";
// Design Ref: §4.6 — QueryClientProvider 래핑
// Design Ref: §4.5 (auth-login-v2) — AuthProvider 추가
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@shared/api";

interface Props {
  children: React.ReactNode;
}

export function Providers({ children }: Props) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
