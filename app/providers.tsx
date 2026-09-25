'use client'
// Design Ref: §4.6 — QueryClientProvider 래핑
// Design Ref: §4.5 (auth-login-v2) — AuthProvider 추가
// Plan SC: R-06, SC-05
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@shared/api/query'
import { AuthProvider } from '@features/auth-login'

interface Props {
  children: React.ReactNode
}

export function Providers({ children }: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  )
}
