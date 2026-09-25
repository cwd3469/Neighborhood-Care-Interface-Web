# [Plan] api-client

> axios 인스턴스 + 401 자동 refresh interceptor — API 요청 중 token 만료 처리

**작성일**: 2026-09-25
**상태**: Plan 완료
**전제**: auth-refresh-token 완료 (`/api/auth/refresh` Route Handler 존재)

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 페이지 체류 중 access_token 만료 시 API 요청이 401로 실패 — proxy.ts는 페이지 이동 시에만 작동 |
| **Solution** | axios interceptor: 401 응답 감지 → `/api/auth/refresh` 호출 → 원래 요청 재시도. 실패 시 router.push('/login') |
| **Function UX Effect** | 세션 중 토큰 만료가 사용자에게 투명하게 처리됨. 1시간 후에도 계속 API 호출 가능 |
| **Core Value** | proxy.ts(이동 시) + axios interceptor(체류 중) — 두 레이어로 완전한 silent refresh 구현 |

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | proxy.ts는 페이지 이동만 처리 → 체류 중 API 401은 미처리. 완전한 세션 유지 필요 |
| **WHO** | Client Component에서 API 호출하는 모든 기능 (케어 기록, 일정 조회 등) |
| **RISK** | interceptor에서 router.push 호출 불가(훅 외부) → setter 패턴 필요 / refresh 무한 루프 방지 |
| **SUCCESS** | access_token 만료 후 API 호출 시 자동 재시도, 사용자 인지 없이 성공 |
| **SCOPE** | client.ts + index.ts 신규. providers.tsx 수정(router setter 등록). react-query onError 연동 |

---

## 1. 배경

**현재 인증 레이어:**

```
[페이지 이동 시] proxy.ts ✅ (auth-refresh-token 구현 완료)
  → access_token 없음 → refresh 시도 → 성공/실패

[API 요청 중] ❌ 미처리
  → Client Component가 /api/records 호출
  → Route Handler → FastAPI → 401
  → 현재: ApiError로 그냥 throw
```

**목표:**

```
[API 요청 중] axios interceptor ✅
  → 401 감지
  → POST /api/auth/refresh
  → 성공: 원래 요청 재시도
  → 실패: router.push('/login')
```

---

## 2. 아키텍처

```
[Client Component]
  useQuery({ queryFn: () => api.get('/records') })
       ↓
[src/shared/api/client.ts]  (axios 인스턴스)
  → withCredentials: true (쿠키 자동 전송)
  → baseURL: '' (Next.js Route Handler = 같은 origin)
       ↓
[Next.js Route Handler /api/records]
  → httpOnly cookie → FastAPI
  → 401 응답
       ↓
[axios response interceptor]
  ├─ 401이고 refresh 시도 전?
  │    → POST /api/auth/refresh
  │    ├─ 200: originalRequest 재시도 (쿠키 갱신됨)
  │    └─ 401: navigateToLogin() → /login
  └─ 401이고 refresh 재시도 중? → throw (무한 루프 방지)
```

**router.push 호출 방법 (setter 패턴):**

```typescript
// client.ts — interceptor 내부에서 직접 useRouter 불가
let _navigateToLogin: (() => void) | null = null

export function setNavigateToLogin(fn: () => void) {
  _navigateToLogin = fn
}

// providers.tsx — AuthProvider 내부에서 등록
const router = useRouter()
useEffect(() => {
  setNavigateToLogin(() => router.push('/login'))
}, [router])
```

---

## 3. 요구사항

### R-01: `src/shared/api/client.ts` — axios 인스턴스 (신규)

```typescript
import axios from 'axios'

const apiClient = axios.create({
  baseURL: '',              // 같은 origin — Next.js Route Handler
  withCredentials: true,    // httpOnly 쿠키 자동 전송
  headers: { 'Content-Type': 'application/json' },
})
```

### R-02: 401 response interceptor

```typescript
// refresh 재시도 플래그 (무한 루프 방지)
let isRefreshing = false

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // refresh 중 또 401 → 포기
        _navigateToLogin?.()
        return Promise.reject(parseAxiosError(error))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        await apiClient.post('/api/auth/refresh')
        return apiClient(originalRequest) // 재시도
      } catch {
        _navigateToLogin?.()
        return Promise.reject(parseAxiosError(error))
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(parseAxiosError(error))
  }
)
```

### R-03: public API 메서드

```typescript
export const api = {
  get:    <T>(url: string, config?) => apiClient.get<T>(url, config).then(r => r.data),
  post:   <T>(url: string, data?, config?) => apiClient.post<T>(url, data, config).then(r => r.data),
  put:    <T>(url: string, data?, config?) => apiClient.put<T>(url, data, config).then(r => r.data),
  patch:  <T>(url: string, data?, config?) => apiClient.patch<T>(url, data, config).then(r => r.data),
  delete: <T>(url: string, config?) => apiClient.delete<T>(url, config).then(r => r.data),
}
```

### R-04: `src/shared/api/index.ts` — public API (신규)

```typescript
export { api, setNavigateToLogin } from './client'
export { queryClient } from './query'
export type { ApiError, ApiClient } from './types'
```

### R-05: `app/providers.tsx` 수정 — router setter 등록

```typescript
'use client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { setNavigateToLogin } from '@shared/api'

// Providers 함수 내부 (AuthProvider 안에서):
const router = useRouter()
useEffect(() => {
  setNavigateToLogin(() => router.push('/login'))
}, [router])
```

### R-06: react-query 연동 — QueryClient onError

```typescript
// query.ts 수정 — 전역 에러 처리
import type { ApiError } from './types'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: (failureCount, error) => {
        const apiErr = error as ApiError
        if (apiErr.status === 401) return false // 401은 재시도 안 함
        return failureCount < 1
      },
    },
  },
})
```

---

## 4. 파일 계획

```
신규 2개:
  src/shared/api/client.ts   axios 인스턴스 + interceptor + setNavigateToLogin
  src/shared/api/index.ts    public API export

수정 2개:
  app/providers.tsx          setNavigateToLogin 등록 (useEffect)
  src/shared/api/query.ts    retry 옵션 수정 (401 재시도 방지)

변경 없음:
  errors.ts  types.ts  server.ts  schema.d.ts
```

---

## 5. 성공 기준 (Success Criteria)

| # | 기준 | 검증 방법 |
|---|------|----------|
| SC-01 | access_token 만료 후 `api.get()` 호출 시 자동 재시도 성공 | DevTools Network 탭: /api/auth/refresh → 원래 요청 재호출 확인 |
| SC-02 | refresh 실패 시 `/login`으로 이동 | /api/auth/refresh mock 401 후 리디렉션 확인 |
| SC-03 | 정상 요청 시 interceptor 투명 통과 | 200 응답이 그대로 반환 |
| SC-04 | `api.get<T>()` 타입 안전성 — 반환값 T | TypeScript 추론 확인 |
| SC-05 | react-query에서 401 에러 시 재시도 없음 | query retry=0 for 401 |
| SC-06 | `pnpm tsc --noEmit` 에러 없음 | TypeScript 검증 |

---

## 6. 리스크

| 리스크 | 심각도 | 대응 |
|--------|--------|------|
| interceptor 무한 루프 (`_retry` 플래그 누락) | 높음 | `originalRequest._retry = true` + `isRefreshing` 플래그 이중 방어 |
| providers.tsx에서 useRouter 호출 위치 문제 | 중 | QueryClientProvider 내부 + 'use client' 확인 |
| `setNavigateToLogin` 미등록 시 silent fail | 중 | fallback: `window.location.href = '/login'` |
| React StrictMode 이중 실행으로 setter 덮어쓰기 | 저 | 동일 함수 재등록이므로 문제 없음 |

---

## 7. 범위 밖 (Out of Scope)

- request interceptor (Authorization 헤더 주입) — httpOnly 쿠키로 불필요
- 동시 401 요청 큐잉 (여러 요청이 동시에 만료) — 추후 개선
- SSE/WebSocket 토큰 갱신 — 별도 feature

---

## 8. 다음 단계

- `/pdca design api-client`
