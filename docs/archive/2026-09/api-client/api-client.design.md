# [Design] api-client

**작성일**: 2026-09-25
**상태**: Design 완료
**선택 아키텍처**: Option C — 모듈 싱글톤 + 동시 401 큐

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 페이지 체류 중 API 401 시 자동 refresh+재시도 없음 → 사용자에게 에러 노출 |
| **WHO** | Client Component에서 api.get/post를 사용하는 모든 기능 |
| **RISK** | 동시 401 중복 refresh / interceptor에서 useRouter 불가 / 무한 루프 |
| **SUCCESS** | access_token 만료 후 API 호출이 사용자 인지 없이 성공 |
| **SCOPE** | client.ts + index.ts 신규, providers.tsx + query.ts 수정 |

---

## 1. Overview

**선택: Option C — 모듈 싱글톤 + 실패 큐(failedQueue)**

```
[Client Component]  useQuery → api.get('/records')
        ↓
[client.ts]  axios.create({ baseURL: '', withCredentials: true })
        ↓
[Next.js Route Handler]  httpOnly 쿠키 자동 전송 → FastAPI → 401
        ↓
[response interceptor]
  ├─ !isRefreshing: 첫 번째 401 → refresh 시도
  │    ├─ 성공: failedQueue 전체 resolve → 각자 재시도
  │    └─ 실패: failedQueue 전체 reject → navigateToLogin()
  └─ isRefreshing: 나머지 401 → failedQueue에 적재 → 대기
```

**동시 401 처리 흐름:**
```
t=0: api.get('/a'), api.get('/b'), api.get('/c') 동시 요청
t=1: 세 요청 모두 401 수신
t=2: '/a' → isRefreshing=false → refresh 시작, isRefreshing=true
     '/b', '/c' → isRefreshing=true → failedQueue에 push
t=3: refresh 성공
     → processQueue(null): '/b', '/c' resolve → 재시도
     → '/a' 재시도
t=4: 세 요청 모두 성공 응답
```

---

## 2. 파일별 설계

### 2.1 `src/shared/api/client.ts` — 신규

```typescript
// Design Ref: §2.1 — axios 싱글톤 + 동시 401 큐 패턴
'use client'  // ← 이 파일은 Client Component 전용
import axios from 'axios'
import { parseAxiosError } from './errors'

// ── router setter (interceptor에서 useRouter 직접 호출 불가) ──────────
let _navigateToLogin: (() => void) | null = null
export function setNavigateToLogin(fn: () => void): void {
  _navigateToLogin = fn
}
function navigateToLogin(): void {
  if (_navigateToLogin) {
    _navigateToLogin()
  } else {
    // fallback: setter 미등록 시 (providers.tsx 마운트 전 등)
    window.location.href = '/login'
  }
}

// ── 동시 401 큐 ──────────────────────────────────────────────────────
type QueueItem = { resolve: () => void; reject: (err: unknown) => void }
let isRefreshing = false
let failedQueue: QueueItem[] = []

function processQueue(error: unknown): void {
  failedQueue.forEach((item) => {
    if (error) item.reject(error)
    else item.resolve()
  })
  failedQueue = []
}

// ── axios 인스턴스 ────────────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: '',             // 같은 origin — Next.js Route Handler
  withCredentials: true,   // httpOnly 쿠키 자동 전송
  headers: { 'Content-Type': 'application/json' },
})

// ── response interceptor ─────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean }

    // 401이 아니거나 이미 retry 중이면 그냥 throw
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(parseAxiosError(error))
    }

    if (isRefreshing) {
      // 다른 요청이 refresh 중 → 큐에서 대기
      return new Promise<void>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      })
        .then(() => apiClient(originalRequest))
        .catch((err) => Promise.reject(err))
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      await apiClient.post('/api/auth/refresh')
      processQueue(null)
      return apiClient(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError)
      navigateToLogin()
      return Promise.reject(parseAxiosError(error))
    } finally {
      isRefreshing = false
    }
  }
)

// ── public API ────────────────────────────────────────────────────────
export const api = {
  get:    <T>(url: string, config?: Parameters<typeof apiClient.get>[1]) =>
    apiClient.get<T>(url, config).then((r) => r.data),
  post:   <T>(url: string, data?: unknown, config?: Parameters<typeof apiClient.post>[2]) =>
    apiClient.post<T>(url, data, config).then((r) => r.data),
  put:    <T>(url: string, data?: unknown, config?: Parameters<typeof apiClient.put>[2]) =>
    apiClient.put<T>(url, data, config).then((r) => r.data),
  patch:  <T>(url: string, data?: unknown, config?: Parameters<typeof apiClient.patch>[2]) =>
    apiClient.patch<T>(url, data, config).then((r) => r.data),
  delete: <T>(url: string, config?: Parameters<typeof apiClient.delete>[1]) =>
    apiClient.delete<T>(url, config).then((r) => r.data),
}
```

### 2.2 `src/shared/api/index.ts` — 신규

```typescript
export { api, setNavigateToLogin } from './client'
export { queryClient } from './query'
export type { ApiError } from './types'
// server.ts는 Server Component 전용 — 직접 import 유지
```

### 2.3 `app/providers.tsx` — 수정

```typescript
'use client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient, setNavigateToLogin } from '@shared/api'
import { AuthProvider } from '@features/auth-login'

interface Props { children: React.ReactNode }

export function Providers({ children }: Props) {
  const router = useRouter()

  useEffect(() => {
    // Design Ref: §2.3 — interceptor router setter 등록
    setNavigateToLogin(() => router.push('/login'))
  }, [router])

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
}
```

### 2.4 `src/shared/api/query.ts` — 수정

```typescript
// Design Ref: §2.4 — 401 에러는 react-query retry 제외
import { QueryClient } from '@tanstack/react-query'
import type { ApiError } from './types'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: (failureCount, error) => {
        // 401은 interceptor가 처리 → react-query 재시도 불필요
        if ((error as ApiError).status === 401) return false
        return failureCount < 1
      },
    },
  },
})
```

---

## 3. 타입 보완

`src/shared/api/types.ts`에 `ApiClient` 타입 추가 (선택):

```typescript
// 현재 ApiError만 있음 — api 객체 타입 선택적 추가
export type ApiClient = typeof import('./client').api
```

이미 Plan에서 `ApiClient` export를 명시했으므로 index.ts에서 re-export.

---

## 4. 엣지 케이스

| 케이스 | 처리 방법 |
|--------|----------|
| `_navigateToLogin` 미등록 상태에서 refresh 실패 | fallback: `window.location.href = '/login'` |
| `/api/auth/refresh` 자체가 401 반환 | `refreshError` catch → `navigateToLogin()` |
| react-query `retry: 1`로 401을 재시도 | `query.ts` 수정으로 401 retry=false |
| providers.tsx useEffect 이전 API 호출 | setter 미등록 → window.location fallback |
| refresh 성공 후 originalRequest 재시도도 401 | `_retry: true` 플래그로 무한 루프 방지 |

---

## 5. 보안

- **withCredentials: true**: httpOnly 쿠키 자동 전송 — JS로 토큰 접근 불가 유지
- **baseURL: ''**: 같은 origin만 — CORS 문제 없음
- **request interceptor 없음**: Authorization 헤더 주입 없음 (쿠키 기반)

---

## 6. 의존성

```bash
# axios 이미 설치 여부 확인 필요
pnpm add axios
# @tanstack/react-query 이미 설치됨 (query.ts에서 사용 중)
```

---

## 7. 사용 예시

```typescript
// Client Component에서
'use client'
import { api } from '@shared/api'
import { useQuery } from '@tanstack/react-query'

export function RecordList() {
  const { data, error } = useQuery({
    queryKey: ['records'],
    queryFn: () => api.get<Record[]>('/api/records'),
  })
  // access_token 만료 → interceptor가 자동 처리
  // refresh 실패 → /login redirect (사용자 인지 없음)
}
```

---

## 8. 성공 기준 검증 매핑

| Plan SC | 구현 위치 |
|---------|----------|
| SC-01: 자동 재시도 성공 | interceptor retry 로직 |
| SC-02: refresh 실패 → /login | navigateToLogin() + window fallback |
| SC-03: 정상 요청 투명 통과 | `(response) => response` |
| SC-04: 타입 안전성 | `api.get<T>()` 제네릭 |
| SC-05: 401 react-query retry=false | query.ts retry 함수 |
| SC-06: tsc --noEmit 통과 | 전체 |

---

## 11. Implementation Guide

### 11.1 구현 순서

```
1. axios 설치 확인 (package.json 체크)
2. src/shared/api/client.ts 신규 생성
3. src/shared/api/index.ts 신규 생성
4. src/shared/api/query.ts 수정 (retry 옵션)
5. app/providers.tsx 수정 (setNavigateToLogin)
6. pnpm tsc --noEmit
```

### 11.2 주의사항

- `client.ts` 상단에 `'use client'` 필요 — Server Component에서 import 시 빌드 에러
- `server.ts`는 독립 유지 — Server Component용, client.ts와 분리
- `index.ts`에서 `server.ts` re-export 금지 — Client/Server 경계 혼용 방지

### 11.3 Session Guide

| 모듈 | 파일 | 작업 |
|------|------|------|
| M1 | `src/shared/api/client.ts` | 신규 (~60줄) |
| M2 | `src/shared/api/index.ts` | 신규 (~5줄) |
| M3 | `src/shared/api/query.ts` | retry 옵션 수정 (~5줄) |
| M4 | `app/providers.tsx` | setNavigateToLogin 등록 (~5줄) |

**Single Session 권장** — 전체 변경량 적음

```bash
/pdca do api-client           # 전체
/pdca do api-client --scope M1,M2  # client + index 먼저
/pdca do api-client --scope M3,M4  # query + providers 후
```
