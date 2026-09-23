# [Design] shared-api-client

> src/shared/api/ — Closure Factory 기반 FastAPI fetch wrapper

**작성일**: 2026-09-19
**선택 아키텍처**: Option C — Closure Factory
**상태**: Design 완료

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 중복 fetch 제거 + FastAPI 에러 타입 통일 — 모든 feature API 호출의 공통 기반 |
| **WHO** | 프론트 개발자 1인 (5년차) — 구현 원리 중심 |
| **RISK** | 백엔드 스펙 미확정 — 타입/인터페이스 설계가 유연해야 나중에 수정 최소화 |
| **SUCCESS** | `api.get<T>()` TypeScript 에러 없이 동작 + `ApiError` export 가능 |
| **SCOPE** | fetch wrapper + 타입 + setAuthToken stub — JWT 획득/갱신은 인증 feature |

---

## 1. 아키텍처 결정

### 선택: Option C — Closure Factory

**근거**:
- 클로저가 `token` 상태를 캡슐화 — 모듈 레벨 전역 변수 없음
- 순수 객체 반환 → `this` 바인딩 문제 없음, destructuring 가능 (`const { get } = api`)
- `createApiClient(url)` 형태라 테스트 시 다른 baseUrl로 격리 인스턴스 생성 가능
- Plan의 4파일 구조(`types.ts`, `errors.ts`, `client.ts`, `index.ts`)와 정확히 일치

---

## 2. 파일 구조 및 책임

```
src/shared/api/
  types.ts          # ApiError, ApiResponse<T> 타입 정의 — 외부 의존 없음
  errors.ts         # HTTP 응답 → ApiError 변환 (parseError 함수)
  client.ts         # createApiClient 팩토리 + request 내부 헬퍼
  index.ts          # api 싱글톤 export + 타입 re-export
```

### 의존 방향
```
index.ts → client.ts → errors.ts → types.ts
                         (types.ts는 순수 타입, 다른 파일 import 없음)
```

---

## 3. 타입 설계 (types.ts)

```typescript
// Design Ref: §3 — Plan R-03, R-04 기반

export interface ApiError {
  status: number;      // HTTP 상태 코드 (400, 401, 403, 404, 422, 500)
  message: string;     // 사람이 읽을 수 있는 에러 메시지
  detail: unknown;     // FastAPI detail 필드 (422: [{ loc, msg, type }])
  code: string;        // UNAUTHORIZED | NOT_FOUND | VALIDATION_ERROR | ...
}

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  status: number;
}
```

---

## 4. 에러 변환 로직 (errors.ts)

HTTP 상태 코드 → `ApiError.code` 매핑:

```typescript
// Design Ref: §4 — FastAPI 에러 응답 형식 기준

const STATUS_CODE_MAP: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  422: 'VALIDATION_ERROR',
  500: 'INTERNAL_ERROR',
}

export async function parseError(response: Response): Promise<ApiError> {
  let detail: unknown = null
  let message = response.statusText

  try {
    const body = await response.json()
    // FastAPI: { detail: "string" } 또는 { detail: [...] }
    detail = body.detail ?? body
    message = typeof body.detail === 'string'
      ? body.detail
      : `HTTP ${response.status}`
  } catch {
    // JSON 파싱 실패 시 statusText 그대로
  }

  return {
    status: response.status,
    message,
    detail,
    code: STATUS_CODE_MAP[response.status] ?? 'UNKNOWN_ERROR',
  }
}
```

**설계 포인트**:
- `parseError`는 `async` — `response.json()` 한 번만 소비 (body stream은 한 번만 읽을 수 있음)
- FastAPI `422 Unprocessable Entity`의 `detail: [{ loc, msg, type }]` 배열을 `detail: unknown`에 그대로 보존
- 각 feature에서 `422`를 처리할 때 `error.detail`을 narrowing해서 사용

---

## 5. 클라이언트 팩토리 (client.ts)

```typescript
// Design Ref: §5 — Closure Factory 패턴

import type { ApiResponse } from './types'
import { parseError } from './errors'

// 내부 헬퍼 — 외부 미노출
async function request<T>(
  method: string,
  url: string,
  headers: HeadersInit,
  body?: unknown,
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error = await parseError(response)
      return { data: null, error, status: response.status }
    }

    // 204 No Content — body 없음
    if (response.status === 204) {
      return { data: null, error: null, status: 204 }
    }

    const data = await response.json() as T
    return { data, error: null, status: response.status }
  } catch (err) {
    // 네트워크 오류 (fetch 자체 실패)
    return {
      data: null,
      error: {
        status: 0,
        message: err instanceof Error ? err.message : 'Network error',
        detail: null,
        code: 'NETWORK_ERROR',
      },
      status: 0,
    }
  }
}

export function createApiClient(baseUrl: string) {
  let token: string | null = null

  const headers = (): HeadersInit => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  })

  return {
    // Plan SC: R-06 — setAuthToken stub
    setAuthToken: (t: string | null) => { token = t },

    get:    <T>(path: string)                => request<T>('GET',    baseUrl + path, headers()),
    post:   <T>(path: string, body: unknown) => request<T>('POST',   baseUrl + path, headers(), body),
    put:    <T>(path: string, body: unknown) => request<T>('PUT',    baseUrl + path, headers(), body),
    patch:  <T>(path: string, body: unknown) => request<T>('PATCH',  baseUrl + path, headers(), body),
    delete: <T>(path: string)                => request<T>('DELETE', baseUrl + path, headers()),
  }
}
```

**설계 포인트**:
- `request` 함수는 모듈 내부 전용 — `export` 없음
- `headers()`는 매 요청마다 호출 — 토큰이 나중에 설정되어도 반영됨
- 204 No Content 처리 — FHIR DELETE 등에서 빈 응답 반환
- try/catch로 네트워크 오류 포착 → `NETWORK_ERROR` code

---

## 6. 진입점 (index.ts — 교체)

```typescript
// Design Ref: §6 — FSD Public API pattern (Plan SC: R-01)

export type { ApiError, ApiResponse } from './types'
export { createApiClient } from './client'

// 싱글톤 인스턴스 — 앱 전체에서 import { api } from '@shared/api' 로 사용
// Plan SC: R-05 — NEXT_PUBLIC_API_URL 환경변수
export const api = createApiClient(process.env.NEXT_PUBLIC_API_URL ?? '')
```

---

## 7. 환경변수 파일

**`.env.local`** (gitignore 대상):
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**`.env.local.example`** (커밋 포함):
```
# FastAPI 백엔드 URL
# 개발: http://localhost:8000
# 프로덕션: Vercel 환경변수로 별도 관리
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 8. 사용 예시 (feature에서)

```typescript
// features/record-health-metric/api/healthMetricApi.ts
import { api } from '@shared/api'
import type { ApiError } from '@shared/api'

export async function postObservation(payload: ObservationPayload) {
  const { data, error } = await api.post<ObservationResponse>('/observations', payload)

  if (error) {
    if (error.code === 'VALIDATION_ERROR') {
      // 422: error.detail은 FastAPI [{ loc, msg, type }] 배열
      console.error('Validation failed:', error.detail)
    }
    throw error  // 또는 반환해서 UI에서 처리
  }

  return data!
}
```

---

## 9. 구현 가이드 (Do Phase)

### 9.1 구현 순서

| 순서 | 파일 | 내용 |
|------|------|------|
| 1 | `src/shared/api/types.ts` | `ApiError`, `ApiResponse<T>` 타입 정의 |
| 2 | `src/shared/api/errors.ts` | `parseError` 함수 |
| 3 | `src/shared/api/client.ts` | `request` 헬퍼 + `createApiClient` |
| 4 | `src/shared/api/index.ts` | 기존 `export {}` 교체, 싱글톤 export |
| 5 | `.env.local` + `.env.local.example` | 환경변수 |
| 6 | `pnpm build` 확인 | TypeScript 컴파일 에러 없음 |

### 9.2 Session Guide

단일 세션 완료 가능 (~20분). `--scope` 불필요.

### 9.3 검증 기준

- `pnpm build` 통과 (TypeScript strict 모드)
- `import { api } from '@shared/api'` 가 에러 없이 동작
- `import type { ApiError } from '@shared/api'` 타입 export 확인
- `api.get<SomeType>('/test')` 의 반환 타입이 `Promise<ApiResponse<SomeType>>` 으로 추론됨
