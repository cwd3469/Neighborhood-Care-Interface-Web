# [Design] auth-login-v2

> useAuth + AuthContext + /api/auth/me — C Pragmatic 설계

**작성일**: 2026-09-25
**상태**: Design 완료
**선택 옵션**: C — Pragmatic

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | Client Component에서 user/role 접근 표준 없음 → AuthContext + /me API 패턴 |
| **WHO** | 프론트 5년차 — React Context, httpOnly cookie 패턴 이미 숙지 |
| **RISK** | SSR hydration mismatch (isLoading: true 초기값으로 해결) / 'use client' 경계 |
| **SUCCESS** | useAuth()로 { user, isAuthenticated, isLoading } 정상 반환, tsc 에러 없음 |
| **SCOPE** | AuthContext + AuthProvider + useAuth + /me Route Handler — logout 제외 |

---

## 1. Overview

### 1.1 선택 옵션

| 옵션 | 파일 수 | 선택 |
|------|---------|------|
| A — Minimal | 신규 2 + 수정 2 | |
| B — Clean Arch | 신규 5 + 수정 2 | |
| **C — Pragmatic** | **신규 3 + 수정 2** | **✅** |

**선택 근거**: FSD `model/` 디렉토리에 역할별 단일 파일 배치. 확장 가능하나 과도하지 않음.

### 1.2 의존성

추가 패키지 없음 — React `createContext`, `useContext`, `useEffect`, `useState` 기본 사용.

---

## 2. 파일 구조 (5개)

```
신규:
  app/api/auth/me/route.ts                          /me Route Handler
  src/features/auth-login/model/AuthContext.tsx      Context + AuthUser type
  src/features/auth-login/model/AuthProvider.tsx     'use client' Provider

수정:
  app/providers.tsx                                  AuthProvider 추가
  src/features/auth-login/index.ts                   useAuth, AuthProvider export 추가

변경 없음:
  app/api/auth/login/route.ts  proxy.ts
  src/features/auth-login/api/login.ts
  src/features/auth-login/model/useLogin.ts
  src/features/auth-login/ui/LoginForm.tsx
  src/shared/api/server.ts
```

---

## 3. Module Map

| 모듈 | 파일 | 역할 |
|------|------|------|
| M1 | `app/api/auth/me/route.ts` | httpOnly cookie 읽기 → { role } 반환 |
| M2 | `model/AuthContext.tsx` | AuthUser type + AuthContext 정의 |
| M2 | `model/AuthProvider.tsx` | mount 시 /me 호출, Context 공급 |
| M2 | `model/useAuth.ts` | AuthContext 소비 → { user, isAuthenticated, isLoading } |
| M3 | `app/providers.tsx` | QueryClientProvider + AuthProvider 조합 |
| M3 | `src/features/auth-login/index.ts` | useAuth, AuthProvider export 추가 |

---

## 4. 상세 설계

### 4.1 `app/api/auth/me/route.ts` (신규)

```typescript
// Design Ref: §4.1 — httpOnly cookie에서 인증 상태 읽기
// Plan SC: SC-04
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  const role = cookieStore.get('user_role')?.value

  if (!token || !role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ role })
}
```

- `access_token` AND `user_role` 모두 있어야 200
- 둘 중 하나라도 없으면 401
- FastAPI 호출 없음 — cookie만 읽음
- `await cookies()` — Next.js 16 async API

### 4.2 `src/features/auth-login/model/AuthContext.tsx` (신규)

```typescript
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
```

- `AuthUser`: role만 포함 (추후 email 등 확장 가능)
- 초기값: `user: null, isLoading: true` — SSR에서 항상 로딩 상태
- `createContext` 기본값은 Provider 없이 사용 시 fallback

### 4.3 `src/features/auth-login/model/AuthProvider.tsx` (신규)

```typescript
// Design Ref: §4.3 — mount 시 /api/auth/me 호출, Context 공급
// Plan SC: SC-01, SC-02, SC-03
'use client'
import { useState, useEffect } from 'react'
import { AuthContext } from './AuthContext'
import type { AuthUser } from './AuthContext'

interface Props {
  children: React.ReactNode
}

export function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: AuthUser | null) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}
```

- `'use client'` — 필수 (useEffect 사용)
- `useEffect` — 클라이언트 mount 후 /me 호출 (SSR hydration mismatch 방지)
- 에러 발생 시 `user: null`로 처리 (graceful degradation)
- `isLoading: true` 초기값 → fetch 완료 후 `false`

### 4.4 `src/features/auth-login/model/useAuth.ts` (신규)

```typescript
// Design Ref: §4.4 — AuthContext 소비 훅
// Plan SC: SC-01, SC-02, SC-03
'use client'
import { useContext } from 'react'
import { AuthContext } from './AuthContext'

export function useAuth() {
  const { user, isLoading } = useContext(AuthContext)
  return {
    user,
    isAuthenticated: !!user,
    isLoading,
  }
}
```

반환값:
| 키 | 타입 | 설명 |
|----|------|------|
| `user` | `AuthUser \| null` | `{ role }` 또는 null |
| `isAuthenticated` | `boolean` | user !== null |
| `isLoading` | `boolean` | /me 응답 대기 중 |

### 4.5 `app/providers.tsx` (수정)

```typescript
// Design Ref: §4.5 — QueryClientProvider + AuthProvider 조합
// Plan SC: SC-05
'use client'
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
```

- `AuthProvider`는 `QueryClientProvider` 내부 — 추후 react-query로 /me 마이그레이션 가능
- 기존 `QueryClientProvider` 유지

### 4.6 `src/features/auth-login/index.ts` (수정)

```typescript
// Design Ref: §4.6 — public API: useAuth, AuthProvider 추가
export { LoginForm } from './ui/LoginForm'
export { useLogin } from './model/useLogin'
export { useAuth } from './model/useAuth'
export { AuthProvider } from './model/AuthProvider'
export type { AuthUser } from './model/AuthContext'
```

---

## 5. 타입 흐름

```
/api/auth/me (Route Handler)
  → { role: 'guardian' | 'caregiver' | 'admin' }
  → AuthUser 타입

AuthProvider (useEffect)
  → fetch /api/auth/me → AuthUser | null
  → AuthContext.Provider value

useAuth() (Client Component)
  → AuthContext 소비
  → { user: AuthUser | null, isAuthenticated: boolean, isLoading: boolean }
```

---

## 6. SSR / Hydration 전략

| 상황 | user | isLoading | 처리 |
|------|------|-----------|------|
| 서버 렌더링 | null | true | Skeleton / null 렌더링 |
| 클라이언트 mount → /me 호출 중 | null | true | 로딩 UI |
| /me 200 응답 | `{ role }` | false | 정상 렌더링 |
| /me 401 응답 | null | false | 미인증 UI |

> **핵심**: `isLoading: true` 초기값으로 hydration mismatch 방지.
> 서버와 클라이언트 모두 초기에는 `isLoading: true, user: null` → 동일.

---

## 7. Success Criteria 매핑

| SC | 기준 | 설계 위치 |
|----|------|-----------|
| SC-01 | useAuth() 로그인 시 user.role 반환 | AuthProvider + /me 응답 |
| SC-02 | useAuth() 미로그인 시 user: null | /me 401 → setUser(null) |
| SC-03 | isLoading: true → false 전환 | AuthProvider useEffect finally |
| SC-04 | /api/auth/me — token 있으면 200, 없으면 401 | route.ts §4.1 |
| SC-05 | providers.tsx AuthProvider 래핑 | §4.5 |
| SC-06 | tsc --noEmit 에러 없음 | 전체 TypeScript 검증 |

---

## 8. 구현 순서

```
M1 → M2 → M3
```

1. **M1**: `app/api/auth/me/route.ts` (Route Handler 먼저)
2. **M2**: `AuthContext.tsx` → `AuthProvider.tsx` → `useAuth.ts` (Context 레이어)
3. **M3**: `providers.tsx` 수정 → `index.ts` 수정 (조합)

### Session Guide

**단일 세션 구현 가능** (총 5파일, 범위 소)

| 세션 | 모듈 | 파일 수 |
|------|------|---------|
| Session 1 | M1+M2+M3 전체 | 5개 |

---

## 9. 다음 단계

- `/pdca do auth-login-v2`
