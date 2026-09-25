// Design Ref: §4.2 — AuthUser type + AuthContext
// Plan SC: SC-01, SC-02
import { createContext } from 'react'

export interface AuthUser {
  role: 'guardian' | 'caregiver' | 'admin'
}

export interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
})
