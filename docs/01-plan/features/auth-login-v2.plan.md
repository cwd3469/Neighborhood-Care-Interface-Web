# [Plan] auth-login-v2

> auth-login에 useAuth 훅 추가 — AuthContext + /api/auth/me 패턴

**작성일**: 2026-09-25
**상태**: Plan 완료
**전제**: auth-login v1 완료 (httpOnly cookie 인증, proxy.ts 보호 라우트)

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | Client Component에서 현재 로그인 사용자(role)에 접근하는 표준 방법 없음 — 각 컴포넌트가 cookie를 직접 읽거나 prop drilling 필요 |
| **Solution** | AuthContext + `/api/auth/me` Route Handler — 앱 루트에서 인증 상태 로드, `useAuth()`로 어디서나 소비 |
| **Function UX Effect** | 헤더 사용자 이름 표시, 역할별 메뉴 분기, 로딩 중 스켈레톤 등 Client Component에서 user/role 즉시 접근 |
| **Core Value** | httpOnly cookie + AuthContext 조합 — "왜 /me API를 쓰는가", "Context 초기화 패턴" 면접 어필 포인트 |

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | Client Component에서 인증 상태 접근 표준 부재 → 대시보드 UI 구현 시 매번 별도 해결책 필요 |
| **WHO** | 프론트 5년차 — React Context, httpOnly cookie 패턴 이미 숙지 |
| **RISK** | `/api/auth/me` 호출 타이밍 (hydration mismatch 방지) / AuthProvider가 SSR 비호환 여부 |
| **SUCCESS** | `useAuth()` 호출로 `{ user, isAuthenticated, isLoading }` 정상 반환, 로그인 후 상태 자동 반영 |
| **SCOPE** | useAuth + AuthContext + /me Route Handler 추가 — logout, refresh token 별도 feature |

---

## 1. 배경

**auth-login v1 완료 상태:**
```
app/api/auth/login/route.ts    → FastAPI 프록시, httpOnly cookie 설정
proxy.ts                        → 보호 라우트 (미인증 → /login 리디렉션)
src/features/auth-login/
  api/login.ts                  → POST /api/auth/login 호출
  model/useLogin.ts             → 로그인 action 훅 (useState)
  ui/LoginForm.tsx              → 로그인 폼
src/shared/api/server.ts        → getServerApiHeaders() (Server Component용)
```

**현재 문제**: Client Component에서 `user_role` 쿠키를 읽을 방법 없음.
httpOnly cookie는 JS로 접근 불가 → `/api/auth/me` Route Handler를 거쳐야 함.

---

## 2. 아키텍처

```
[AuthProvider] (app/providers.tsx에 추가)
  ↓ mount 시 fetch /api/auth/me
  → AuthContext: user | null

[app/api/auth/me/route.ts]
  → httpOnly cookie(access_token, user_role) 읽기
  → { role } 반환 또는 401

[useAuth()]
  → AuthContext 소비
  → { user: { role } | null, isAuthenticated, isLoading }

[로그인 흐름]
  LoginForm → useLogin (기존 유지) → router.push('/dashboard')
  → 페이지 이동 시 AuthProvider remount → /me 재호출 → 새 user 상태 반영
```

---

## 3. 요구사항

### R-01: `/api/auth/me` Route Handler (신규)

```typescript
// app/api/auth/me/route.ts
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

- httpOnly cookie 읽기 → `{ role }` 반환
- token 없으면 401 (throw 하지 않음 — isAuthenticated: false로 처리)
- 추후 role 외 user info 확장 가능 구조

### R-02: AuthContext (신규)

```typescript
// src/features/auth-login/model/AuthContext.tsx
export interface AuthUser {
  role: 'guardian' | 'caregiver' | 'admin'
}

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
})
```

### R-03: AuthProvider (신규)

```typescript
// src/features/auth-login/model/AuthProvider.tsx
'use client'
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => setUser(data))
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}
```

- `'use client'` — Client Component
- mount 시 `/api/auth/me` 한 번 호출
- 401 → `user: null` (isAuthenticated: false)

### R-04: useAuth 훅 (신규)

```typescript
// src/features/auth-login/model/useAuth.ts
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
| `user` | `AuthUser \| null` | 로그인 사용자 정보 |
| `isAuthenticated` | `boolean` | 인증 여부 |
| `isLoading` | `boolean` | /me 로딩 중 |

### R-05: `app/providers.tsx` 업데이트 (수정)

```typescript
// 기존 QueryClientProvider에 AuthProvider 추가
import { AuthProvider } from '@features/auth-login'

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

QueryClientProvider 내부에 AuthProvider — 순서 중요.

### R-06: `index.ts` 업데이트 (수정)

```typescript
export { useAuth } from './model/useAuth'
export { AuthProvider } from './model/AuthProvider'
// 기존 export 유지
export { LoginForm } from './ui/LoginForm'
export { useLogin } from './model/useLogin'
```

---

## 4. 파일 계획

```
신규 3개:
  app/api/auth/me/route.ts                    /me Route Handler
  src/features/auth-login/model/AuthContext.tsx  Context + AuthUser type
  src/features/auth-login/model/AuthProvider.tsx 'use client' Provider

수정 2개:
  app/providers.tsx                           AuthProvider 추가
  src/features/auth-login/index.ts            useAuth, AuthProvider export 추가

변경 없음:
  app/api/auth/login/route.ts  proxy.ts  useLogin.ts  LoginForm.tsx  login.ts  server.ts
```

---

## 5. 성공 기준 (Success Criteria)

| # | 기준 | 검증 방법 |
|---|------|----------|
| SC-01 | `useAuth()` — 로그인 상태에서 `{ user: { role }, isAuthenticated: true }` 반환 | Client Component에서 호출 확인 |
| SC-02 | `useAuth()` — 미로그인 상태에서 `{ user: null, isAuthenticated: false }` 반환 | 쿠키 없이 확인 |
| SC-03 | `isLoading: true` → `/me` 응답 후 `false`로 전환 | 네트워크 탭 확인 |
| SC-04 | `/api/auth/me` — token 있으면 `{ role }` 200, 없으면 401 | Route Handler 직접 호출 |
| SC-05 | `app/providers.tsx` — AuthProvider 감쌈, QueryClient 내부 유지 | 코드 확인 |
| SC-06 | `pnpm tsc --noEmit` 에러 없음 | TypeScript 검증 |

---

## 6. 리스크

| 리스크 | 심각도 | 대응 |
|--------|--------|------|
| SSR hydration mismatch (`isLoading: true` → client에서만 false) | 중 | `isLoading: true`를 초기값으로 — 서버에서는 항상 loading 상태, 클라이언트 mount 후 확정 |
| `/me` 호출 지연으로 깜빡임 | 저 | isLoading 동안 skeleton/null 렌더링으로 처리 |
| AuthContext를 use client 외부에서 사용 시 에러 | 저 | useAuth는 'use client' 전용 — 문서에 명시 |

---

## 7. 범위 밖 (Out of Scope)

- 로그아웃 (cookie 삭제) — 별도 feature
- Refresh token — 별도 feature
- AuthProvider에서 useQuery 활용 마이그레이션 — 추후 개선
- user.email, user.name 등 추가 정보 — FastAPI /me 연동 후

---

## 8. 다음 단계

- `/pdca design auth-login-v2`
