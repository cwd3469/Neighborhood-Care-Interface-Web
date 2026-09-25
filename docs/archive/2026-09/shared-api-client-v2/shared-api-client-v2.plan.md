# [Plan] shared-api-client-v2

> 기존 fetch 기반 shared-api-client → axios + react-query 전환

**작성일**: 2026-09-24
**상태**: Plan 완료

---

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | shared-api-client-v2 |
| **Milestone** | 리팩터링 — 기존 fetch 클라이언트 교체 |
| **관련 범위** | `src/shared/api/` + QueryClient Provider 셋업 |

### Value Delivered (4 Perspectives)

| 관점 | 내용 |
|------|------|
| **Problem** | 네이티브 fetch 기반 수동 상태 관리 — 로딩/에러/캐시를 각 컴포넌트가 직접 처리, 중복 코드 발생 |
| **Solution** | axios AxiosInstance(interceptors) + react-query(QueryClient) — 토큰 주입 자동화, 에러 통합, 서버 상태 캐싱 |
| **Function UX Effect** | 각 feature에서 `useQuery` / `useMutation` 훅으로 데이터 fetching — 로딩/에러/캐시 자동 처리 |
| **Core Value** | axios interceptor 패턴 + react-query 서버 상태 관리 — 실무 표준 스택 포트폴리오 핵심 |

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | fetch 기반 수동 상태 → axios + react-query 실무 표준 스택으로 전환 |
| **WHO** | 프론트 5년차 — 기존 shared-api-client 패턴 이해 완료 |
| **RISK** | 기존 feature api helpers(ai.ts 등)가 직접 fetch 사용 — 마이그레이션 범위 외 충돌 없음 |
| **SUCCESS** | axios 클라이언트 교체 + QueryClientProvider 셋업 완료 |
| **SCOPE** | `src/shared/api/` 교체 + QueryClient Provider 셋업 — feature hooks 마이그레이션 제외 |

---

## 1. 요구사항

### 1.1 기능 요구사항

| # | 요구사항 | 우선순위 |
|---|----------|----------|
| R-01 | `axios` 설치 + `AxiosInstance` 기반 `createApiClient` 재구현 | Must |
| R-02 | request interceptor: `setAuthToken` 토큰 자동 주입 | Must |
| R-03 | response interceptor: `AxiosError` → `ApiError` 변환 후 throw | Must |
| R-04 | 반환 타입: `T` 직접 반환 (ApiResponse<T> 래퍼 제거) — react-query가 error 상태 관리 | Must |
| R-05 | `@tanstack/react-query` 설치 + `QueryClient` 설정 | Must |
| R-06 | `app/providers.tsx` 생성 — `QueryClientProvider` 래핑 | Must |
| R-07 | `app/layout.tsx` 수정 — `Providers` 적용 | Must |
| R-08 | `server.ts` (Route Handler용) 변경 없음 | Must |
| R-09 | `ApiError` 타입 유지 — feature 코드에서 instanceof 활용 가능 | Must |

### 1.2 비기능 요구사항

| # | 요구사항 |
|---|----------|
| NF-01 | `AxiosInstance`의 request interceptor로 token 자동 주입 (헤더 생성 중복 제거) |
| NF-02 | response interceptor에서 모든 non-2xx를 `ApiError`로 정규화 후 throw |
| NF-03 | `createApiClient(baseUrl)` 팩토리 시그니처 유지 — 기존 코드 호환 |
| NF-04 | TypeScript strict 준수 |

### 1.3 Known Constraints

| 제약 | 내용 |
|------|------|
| server.ts 변경 없음 | Route Handler는 native fetch 사용 — Next.js 서버 환경, axios 불필요 |
| feature api helpers 미마이그레이션 | `ai.ts`, `deactivateUser.ts` 등 직접 fetch 사용 코드는 이번 범위 외 |
| React 19 호환 | `@tanstack/react-query` v5 사용 (React 19 지원) |

---

## 2. 설치 패키지

```bash
pnpm add axios @tanstack/react-query
```

---

## 3. 아키텍처 설계

### 3.1 axios 클라이언트

```
createApiClient(baseUrl)
  └─ AxiosInstance 생성
       ├─ request interceptor: token → Authorization 헤더 자동 주입
       ├─ response interceptor: AxiosError → ApiError throw
       └─ 메서드: get<T>, post<T>, put<T>, patch<T>, delete<T>
            └─ 반환: Promise<T>  (throw on error)
```

### 3.2 react-query 셋업

```
app/
  providers.tsx     ← QueryClientProvider (신규)
  layout.tsx        ← <Providers> 적용 (수정)

src/shared/api/
  query.ts          ← QueryClient 인스턴스 (신규)
```

---

## 4. API 설계

### 4.1 `createApiClient` 시그니처 (변경 후)

```typescript
export function createApiClient(baseUrl: string) {
  const instance = axios.create({ baseURL: baseUrl, headers: { 'Content-Type': 'application/json' } })

  // request interceptor: 토큰 자동 주입
  instance.interceptors.request.use((config) => {
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })

  // response interceptor: AxiosError → ApiError throw
  instance.interceptors.response.use(
    (res) => res,
    (err) => Promise.reject(parseAxiosError(err))
  )

  return {
    setAuthToken: (t: string | null) => { token = t },
    get: <T>(path: string) => instance.get<T>(path).then((r) => r.data),
    post: <T>(path: string, body?: unknown) => instance.post<T>(path, body).then((r) => r.data),
    put: <T>(path: string, body?: unknown) => instance.put<T>(path, body).then((r) => r.data),
    patch: <T>(path: string, body?: unknown) => instance.patch<T>(path, body).then((r) => r.data),
    delete: <T>(path: string) => instance.delete<T>(path).then((r) => r.data),
  }
}
```

### 4.2 `errors.ts` — AxiosError 처리

```typescript
import type { AxiosError } from 'axios'

export function parseAxiosError(err: AxiosError): ApiError {
  const status = err.response?.status ?? 0
  const body = err.response?.data as Record<string, unknown> | undefined
  const detail = body?.detail ?? null
  const message = typeof detail === 'string' ? detail : `HTTP ${status}`
  return {
    status,
    message: message || err.message || 'Network error',
    detail,
    code: STATUS_CODE_MAP[status] ?? (status === 0 ? 'NETWORK_ERROR' : 'UNKNOWN_ERROR'),
  }
}
```

### 4.3 `query.ts` — QueryClient 설정

```typescript
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,  // 1분
      retry: 1,
    },
  },
})
```

### 4.4 `app/providers.tsx`

```typescript
'use client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@shared/api/query'

export function Providers({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

---

## 5. 파일 계획

```
src/shared/api/
  client.ts    ← axios 기반으로 교체 (수정)
  errors.ts    ← parseAxiosError로 교체 (수정)
  types.ts     ← ApiResponse<T> 제거, ApiError 유지 (수정)
  index.ts     ← ApiResponse export 제거, 정리 (수정)
  query.ts     ← QueryClient 인스턴스 (신규)
  server.ts    ← 변경 없음

app/
  providers.tsx  ← QueryClientProvider (신규)
  layout.tsx     ← Providers 적용 (수정)
```

**신규 2개 / 수정 6개 = 총 8개**

---

## 6. Success Criteria

| # | 기준 | 검증 방법 |
|---|------|-----------|
| SC-01 | `pnpm tsc --noEmit` 에러 없음 | 타입 검증 |
| SC-02 | axios AxiosInstance 기반 createApiClient | client.ts 확인 |
| SC-03 | request interceptor: token 자동 주입 | interceptor 코드 확인 |
| SC-04 | response interceptor: AxiosError → ApiError throw | errors.ts + interceptor 확인 |
| SC-05 | 반환 타입 `T` 직접 반환 | 메서드 시그니처 확인 |
| SC-06 | QueryClient + QueryClientProvider 셋업 | providers.tsx + layout.tsx 확인 |
| SC-07 | server.ts 변경 없음 | 파일 내용 확인 |

---

## 7. 리스크

| # | 리스크 | 심각도 | 대응 |
|---|--------|--------|------|
| R-01 | 기존 feature 코드가 `ApiResponse<T>` 타입을 직접 사용 중일 경우 | Low | `ApiResponse` 타입은 deprecated 표시만, 즉시 삭제 안 함 |
| R-02 | `app/layout.tsx` 수정 시 Server Component 깨짐 | Low | `Providers`는 'use client', layout은 Server 유지 |
| R-03 | React 19 + @tanstack/react-query v5 호환 | Low | v5는 React 19 공식 지원 |

---

## 8. 다음 단계

- `/pdca design shared-api-client-v2`
