'use client'
// Design Ref: §4.3 — mount 시 /api/auth/me 호출, Context 공급
// Plan SC: SC-01, SC-02, SC-03
import { useState, useEffect } from 'react'
import { AuthContext } from './AuthContext'
import type { AuthUser } from './AuthContext'
import { api } from '@/src/shared/api'

interface Props {
  children: React.ReactNode
}

export function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    api.instance.get('/me')
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}
