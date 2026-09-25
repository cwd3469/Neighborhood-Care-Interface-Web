# [Design] shared-api-client-v2

> fetch 기반 shared-api-client → axios + react-query 전환

**작성일**: 2026-09-24
**상태**: Design 완료
**선택 옵션**: C — Pragmatic

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | fetch 수동 상태 관리 → axios interceptors + react-query 실무 표준 전환 |
| **WHO** | 프론트 5년차 — 기존 shared-api-client 패턴 이해 완료 |
| **RISK** | 기존 feature api helpers가 직접 fetch 사용 — 이번 범위 외, 충돌 없음 |
| **SUCCESS** | axios 클라이언트 교체 + QueryClientProvider 셋업 완료, tsc 에러 없음 |
| **SCOPE** | `src/shared/api/` 교체 + QueryClient Provider — feature hooks 제외 |

---

## 1. Overview

### 1.1 선택 옵션

| 옵션 | 설명 | 파일 수 | 선택 |
|------|------|---------|------|
| A — Minimal | fetch→axios 스왑, QueryClient 미포함 | 4수정 | |
| B — Clean Arch | `api/` + `query/` 디렉토리 분리 | 3신규+5수정 | |
| **C — Pragmatic** | **`api/` 확장 + `query.ts` 추가 + `providers.tsx`** | **2신규+6수정** | **✅** |

**선택 근거**: Plan에서 합의된 구조. `api/` 단일 디렉토리로 응집, query.ts 추가로 react-query 셋업 분리.

### 1.2 의존성

```bash
pnpm add axios @tanstack/react-query
```

---

## 2. 파일 구조 (8개)

```
src/shared/api/
  client.ts      ← axios AxiosInstance + interceptors (수정)
  errors.ts      ← parseAxiosError (수정)
  types.ts       ← ApiError 유지, ApiResponse<T> 제거 (수정)
  index.ts       ← export 정리 (수정)
  query.ts       ← QueryClient 인스턴스 (신규)
  server.ts      ← 변경 없음

app/
  providers.tsx  ← QueryClientProvider (신규)
  layout.tsx     ← <Providers> 적용 (수정)
```

---

## 3. Module Map

| 모듈 | 파일 | 역할 |
|------|------|------|
| M1 | `src/shared/api/types.ts` | ApiError 유지, ApiResponse 제거 |
| M1 | `src/shared/api/errors.ts` | AxiosError → ApiError 변환 |
| M2 | `src/shared/api/client.ts` | AxiosInstance + interceptors |
| M2 | `src/shared/api/index.ts` | public API export 정리 |
| M3 | `src/shared/api/query.ts` | QueryClient 인스턴스 |
| M3 | `app/providers.tsx` | QueryClientProvider 래핑 |
| M3 | `app/layout.tsx` | Providers 적용 |

---

## 4. 상세 설계

### 4.1 `types.ts` (수정)

`ApiResponse<T>` 제거, `ApiError` 유지.

```typescript
// Design Ref: §4.1 — ApiResponse 제거, ApiError만 유지
// react-query가 error 상태를 관리하므로 래퍼 타입 불필요

export interface ApiError {
  status: number
  message: string
  detail: unknown
  code: string
}
```

### 4.2 `errors.ts` (수정)

`parseError(Response)` → `parseAxiosError(AxiosError)`.

```typescript
// Design Ref: §4.2 — AxiosError → ApiError 변환
import type { AxiosError } from 'axios'
import type { ApiError } from './types'

const STATUS_CODE_MAP: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  422: 'VALIDATION_ERROR',
  500: 'INTERNAL_ERROR',
}

export function parseAxiosError(err: AxiosError): ApiError {
  const status = err.response?.status ?? 0
  const body = err.response?.data as Record<string, unknown> | undefined
  const detail = body?.detail ?? null
  const message = typeof detail === 'string'
    ? detail
    : err.message || `HTTP ${status}`
  return {
    status,
    message,
    detail,
    code: STATUS_CODE_MAP[status] ?? (status === 0 ? 'NETWORK_ERROR' : 'UNKNOWN_ERROR'),
  }
}
```

### 4.3 `client.ts` (수정)

fetch → AxiosInstance, interceptors 적용.

```typescript
// Design Ref: §4.3 — AxiosInstance + request/response interceptors
import axios from 'axios'
import type { AxiosInstance } from 'axios'
import { parseAxiosError } from './errors'

export function createApiClient(baseUrl: string) {
  let token: string | null = null

  const instance: AxiosInstance = axios.create({
    baseURL: baseUrl,
    headers: { 'Content-Type': 'application/json' },
  })

  // Plan SC: R-02 — request interceptor: 토큰 자동 주입
  instance.interceptors.request.use((config) => {
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })

  // Plan SC: R-03 — response interceptor: AxiosError → ApiError throw
  instance.interceptors.response.use(
    (res) => res,
    (err) => Promise.reject(parseAxiosError(err))
  )

  return {
    // Plan SC: R-02 — token 설정, null 시 헤더 제거
    setAuthToken: (t: string | null): void => { token = t },

    // Plan SC: R-04 — 반환 T 직접 (react-query가 error 상태 관리)
    get: <T>(path: string): Promise<T> =>
      instance.get<T>(path).then((r) => r.data),

    post: <T>(path: string, body?: unknown): Promise<T> =>
      instance.post<T>(path, body).then((r) => r.data),

    put: <T>(path: string, body?: unknown): Promise<T> =>
      instance.put<T>(path, body).then((r) => r.data),

    patch: <T>(path: string, body?: unknown): Promise<T> =>
      instance.patch<T>(path, body).then((r) => r.data),

    delete: <T>(path: string): Promise<T> =>
      instance.delete<T>(path).then((r) => r.data),
  }
}

export type ApiClient = ReturnType<typeof createApiClient>
```

### 4.4 `index.ts` (수정)

`ApiResponse` export 제거, 나머지 유지.

```typescript
// Design Ref: §4.4 — public API: ApiResponse 제거
export type { ApiError } from './types'
export type { ApiClient } from './client'
export { createApiClient } from './client'

export const api = createApiClient(process.env.NEXT_PUBLIC_API_URL ?? '')
```

### 4.5 `query.ts` (신규)

QueryClient 인스턴스 + 기본 옵션.

```typescript
// Design Ref: §4.5 — QueryClient 인스턴스 (싱글톤)
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,   // 1분 캐시
      retry: 1,               // 실패 시 1회 재시도
    },
  },
})
```

### 4.6 `app/providers.tsx` (신규)

QueryClientProvider — 'use client' 필수.

```typescript
// Design Ref: §4.6 — QueryClientProvider 래핑
'use client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@shared/api/query'

interface Props {
  children: React.ReactNode
}

export function Providers({ children }: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

### 4.7 `app/layout.tsx` (수정)

현재 layout에 `<Providers>` 래핑 추가. Server Component 유지.

```typescript
// 변경 전: <body>...{children}...</body>
// 변경 후: <body>...<Providers>{children}</Providers>...</body>
import { Providers } from './providers'

// body 안:
<body className="min-h-full flex flex-col">
  <Providers>{children}</Providers>
</body>
```

---

## 5. 타입 변경 영향 분석

| 변경 | 영향 범위 | 처리 |
|------|-----------|------|
| `ApiResponse<T>` 제거 | `@shared/api`에서만 export — 현재 feature 코드가 import하지 않음 | 안전하게 제거 |
| 반환 타입 `T` 직접 | `createApiClient`의 메서드 시그니처 변경 — 기존 사용처 없음(feature들은 직접 fetch 사용) | 영향 없음 |
| `parseError` 제거 | `errors.ts` 내부만 사용 — `parseAxiosError`로 교체 | 안전 |

> **참고**: 현재 guardian/caregiver/admin dashboard의 feature api helpers는 모두 직접 `fetch`를 사용하며 `createApiClient`를 사용하지 않음. 따라서 shared/api 변경이 기존 feature에 영향 없음.

---

## 6. 의존성 확인

| 패키지 | 버전 | 역할 |
|--------|------|------|
| `axios` | latest | AxiosInstance, interceptors |
| `@tanstack/react-query` | v5 | QueryClient, QueryClientProvider |

---

## 7. Success Criteria (Plan → Design 매핑)

| SC | 기준 | 설계 위치 |
|----|------|-----------|
| SC-01 | `pnpm tsc --noEmit` 에러 없음 | 전체 TypeScript 검증 |
| SC-02 | axios AxiosInstance 기반 createApiClient | `client.ts` §4.3 |
| SC-03 | request interceptor: token 자동 주입 | `client.ts` interceptors |
| SC-04 | response interceptor: AxiosError → ApiError throw | `client.ts` + `errors.ts` |
| SC-05 | 반환 타입 `T` 직접 반환 | `client.ts` 메서드 시그니처 |
| SC-06 | QueryClient + QueryClientProvider 셋업 | `query.ts` + `providers.tsx` + `layout.tsx` |
| SC-07 | server.ts 변경 없음 | `server.ts` 유지 |

---

## 8. 구현 순서

```
M1 → M2 → M3
```

1. **M1**: `types.ts` + `errors.ts` (기반 타입 먼저)
2. **M2**: `client.ts` + `index.ts` (axios 클라이언트)
3. **M3**: `query.ts` + `providers.tsx` + `layout.tsx` (react-query 셋업)

### 11.3 Session Guide

**단일 세션 구현 가능** (총 7파일 수정/신규, 범위 작음)

| 세션 | 모듈 | 파일 |
|------|------|------|
| Session 1 | M1+M2+M3 | 전체 7개 (server.ts 제외) |

---

## 9. 다음 단계

- `/pdca do shared-api-client-v2`
