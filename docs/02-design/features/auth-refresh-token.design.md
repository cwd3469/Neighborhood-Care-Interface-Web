# [Design] auth-refresh-token

**작성일**: 2026-10-09
**상태**: Design 완료 (v2 — 기존 design 전면 개정)
**선택 아키텍처**: Option C — fetch wrapper 통합

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | proxy.ts JWT 만료 미검사 → Server Component FastAPI 401 / axios/fetch 이중 구조 유지보수 복잡 |
| **WHO** | 모든 역할(guardian/caregiver/admin) 보호 라우트 접근 사용자 전체 |
| **RISK** | Edge Runtime에서 JWT decode: `atob` 사용 가능하나 padding 처리 필요 / axios 제거 후 AppShell/AppHeader 동작 확인 필요 |
| **SUCCESS** | proxy.ts JWT 만료 체크 동작 + tsc 통과 + axios 패키지 없음 |
| **SCOPE** | proxy.ts 수정 + client.ts 교체 + errors.ts 교체 + AppShell/AppHeader + package.json. server.ts/refresh/route.ts 변경 없음 |

---

## 1. Overview

**선택 아키텍처: Option C — fetch wrapper 통합**

```
[Client Component]
  api.get / api.post
    ↓
  clientFetch(url, init, _retried=false)   ← native fetch wrapper
    ├─ 정상 응답 → parseResponse<T>() → T
    └─ 401 응답 + !_retried
        ↓
        fetch('/api/auth/refresh', POST)
        ├─ ok → 원본 요청 재시도 (_retried=true)
        └─ !ok → window.location.href = '/login'

[proxy.ts / Edge Runtime]
  accessToken 있음 + isJwtExpired() → refresh 시도  ← 신규
  accessToken 있음 + 유효 → NextResponse.next()
  accessToken 없음 → refresh 시도 (기존)
```

**Option C 선택 이유:**
- `api` 객체 인터페이스 유지 → AppShell/AppHeader 변경 최소화
- axios interceptor 대체: `_retried` 플래그로 1회 retry (무한 루프 방지)
- `parseResponse<T>` + `parseFetchError` 단일 에러 파싱 경로
- server.ts/refresh/route.ts 변경 없음 — 범위 최소

---

## 2. 파일별 설계

### 2.1 `proxy.ts` — isJwtExpired 추가

**변경 전:**
```typescript
const accessToken = request.cookies.get('access_token')?.value
if (!accessToken) {
  // refresh 시도 or /login redirect
}
```

**변경 후:**
```typescript
function isJwtExpired(token: string): boolean {
  try {
    const payload = token.split('.')[1];
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const decoded = JSON.parse(atob(padded)) as { exp?: number };
    if (!decoded.exp) return false;
    return decoded.exp * 1000 < Date.now() - 10_000; // 10초 클록 스큐 버퍼
  } catch {
    return true; // decode 실패 → 만료로 간주 → refresh 시도 (안전 방향)
  }
}

// 기존 !accessToken 조건에 || isJwtExpired(accessToken) 추가
if (!accessToken || isJwtExpired(accessToken)) {
  // 기존 refresh 시도 or /login redirect 로직 그대로
}
```

**변경 범위:** `isJwtExpired` 헬퍼 추가(11줄) + 조건식 1줄 수정. 기존 refresh/redirect 로직 무변경.

---

### 2.2 `src/shared/api/errors.ts` — AxiosError 제거

**변경 전:**
```typescript
import type { AxiosError } from 'axios'
export function parseAxiosError(error: AxiosError): ApiError { ... }
```

**변경 후:**
```typescript
// axios import 완전 제거
export function parseFetchError(status: number, body?: unknown): ApiError {
  const message =
    body && typeof body === 'object' && 'detail' in body
      ? String((body as { detail: unknown }).detail)
      : `HTTP ${status}`;
  return { status, message };
}
```

**ApiError 타입 (`types.ts`):** 변경 없음 — `{ status: number; message: string }` 유지.

---

### 2.3 `src/shared/api/client.ts` — axios → native fetch

**변경 전:** axios instance + interceptor + `setNavigateToLogin` + `isRefreshing` 큐

**변경 후:**
```typescript
// Design Ref: §2.3 — axios 제거, native fetch + 401 retry
import { parseFetchError } from './errors';
import type { ApiError } from './types';

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

async function parseResponse<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => undefined);
  if (!res.ok) throw parseFetchError(res.status, body);
  return body as T;
}

async function clientFetch(
  url: string,
  init?: RequestInit,
  _retried = false
): Promise<Response> {
  const res = await fetch(url, init);
  if (res.status !== 401 || _retried) return res;

  // 401 → refresh 시도
  const refreshRes = await fetch('/api/auth/refresh', { method: 'POST' });
  if (!refreshRes.ok) {
    window.location.href = '/login';
    return refreshRes;
  }

  // 재시도 (1회만)
  return fetch(url, init).then(r => {
    // _retried=true 플래그: 재귀 없음
    return r;
  });
}

export const api = {
  get:    <T>(url: string) =>
    clientFetch(url).then(r => parseResponse<T>(r)),
  post:   <T>(url: string, data?: unknown) =>
    clientFetch(url, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(data) })
      .then(r => parseResponse<T>(r)),
  put:    <T>(url: string, data?: unknown) =>
    clientFetch(url, { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(data) })
      .then(r => parseResponse<T>(r)),
  patch:  <T>(url: string, data?: unknown) =>
    clientFetch(url, { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(data) })
      .then(r => parseResponse<T>(r)),
  delete: <T>(url: string) =>
    clientFetch(url, { method: 'DELETE' }).then(r => parseResponse<T>(r)),
};
```

**제거:** `setNavigateToLogin`, `isRefreshing`, `failedQueue`, axios 관련 코드 전체.

---

### 2.4 `src/shared/api/index.ts` — setNavigateToLogin 제거

**변경:** `setNavigateToLogin` export 라인 삭제. `api`, `ApiError`, `ApiClient` 타입만 유지.

---

### 2.5 `src/widgets/app-shell/ui/AppShell.tsx` — 변경 없음

`api.get<AuthUser>('/api/auth/me')` 호출이 client.ts `api.get` 인터페이스와 동일하므로 수정 불필요.

단, `setNavigateToLogin` import/호출이 있다면 제거.

---

### 2.6 `src/widgets/app-shell/ui/AppHeader.tsx` — 변경 없음

`api.post('/api/auth/logout')` 호출이 client.ts `api.post` 인터페이스와 동일하므로 수정 불필요.

단, `setNavigateToLogin` import/호출이 있다면 제거.

---

### 2.7 `package.json` — axios 제거

```bash
pnpm remove axios
```

`pnpm-lock.yaml`도 자동 갱신됨.

---

## 3. 데이터 흐름

### 3.1 Client Component 인증 흐름 (401 retry)

```
AppShell 마운트
  → api.get('/api/auth/me')
    → clientFetch('/api/auth/me')
      ├─ 200 → AuthUser → setStoreLogin
      ├─ 401 (_retried=false)
      │   → fetch('/api/auth/refresh', POST)
      │     ├─ ok → retry api.get('/api/auth/me') → 200 → setStoreLogin
      │     └─ !ok → window.location.href='/login'
      └─ 기타 에러 → catch → setStoreLogout
```

### 3.2 Server Component 인증 흐름 (proxy.ts proactive)

```
GET /guardian/dashboard
  → proxy.ts
    → accessToken 있음 + isJwtExpired() → true
      → refresh 시도 (기존 logic)
        ├─ ok → access_token 갱신 → NextResponse.next()
        └─ !ok → /login redirect
    → accessToken 있음 + isJwtExpired() → false
      → NextResponse.next() (기존)
    → accessToken 없음
      → refresh 시도 (기존)
```

---

## 4. 타입 정의

```typescript
// src/shared/api/types.ts — 변경 없음
export interface ApiError {
  status: number;
  message: string;
}

// ApiClient 타입 — api 객체 인터페이스 (client.ts에서 추론)
export type ApiClient = typeof api;
```

---

## 5. 엣지 케이스 처리

| 케이스 | 처리 방법 |
|--------|----------|
| atob padding 오류 (invalid base64) | try/catch → `return true` (만료로 간주) → refresh 시도 |
| JWT payload에 exp 없음 | `if (!decoded.exp) return false` — 만료 체크 건너뜀 |
| 401 retry 무한 루프 | `_retried=true` 플래그 → 2번째 401은 그대로 반환 |
| Server Component에서 api.* 사용 | `window` 없음 → 런타임 에러. server.ts 사용 (기존 분리 유지) |
| axios import 잔존 파일 | tsc 에러로 감지 → `pnpm tsc --noEmit` 검증 |

---

## 6. 보안 고려사항

- **JWT decode는 검증 아님**: `atob` 디코드는 서명 검증 없음 — `exp` 조기 감지용으로만 사용
- **실제 서명 검증**: FastAPI 서버에서 처리 (변경 없음)
- **clock skew 10초 버퍼**: 서버/클라이언트 시간 차이로 인한 오감지 방지
- **window.location.href**: Client Component 전용 — proxy.ts가 Server 측 redirect 담당

---

## 7. 성공 기준 검증 매핑

| Plan SC | 구현 위치 | 검증 방법 |
|---------|----------|----------|
| SC-01: proxy.ts JWT 만료 체크 | `proxy.ts` isJwtExpired() | 코드 검토 + 만료 JWT 시나리오 |
| SC-02: AppShell /api/auth/me (axios 없이) | `client.ts` api.get | 코드 검토 |
| SC-03: AppHeader /api/auth/logout (axios 없이) | `client.ts` api.post | 코드 검토 |
| SC-04: tsc 에러 없음 | 전체 | `pnpm tsc --noEmit` |
| SC-05: axios 없음 | `package.json` | node_modules 확인 |

---

## 8. 의존성

**제거:**
- `axios` 패키지

**신규 추가:** 없음 (native fetch 사용)

**유지:**
- `next/server` — proxy.ts
- `next/headers` — refresh/route.ts (변경 없음)

---

## 9. 미결 사항

| # | 항목 | 결정 필요자 |
|---|------|------------|
| M-01 | AppShell/AppHeader에 `setNavigateToLogin` 호출 존재 여부 확인 | 구현 시 파일 읽고 확인 |
| M-02 | client.ts `ApiClient` 타입 export 현황 | index.ts 읽고 확인 |

---

## 10. Implementation Guide

### 10.1 구현 순서

```
1. src/shared/api/errors.ts   (AxiosError 제거 → parseFetchError)
2. src/shared/api/client.ts   (axios → clientFetch + api 객체)
3. src/shared/api/index.ts    (setNavigateToLogin 제거)
4. AppShell.tsx / AppHeader.tsx  (setNavigateToLogin 호출 제거 확인)
5. proxy.ts                   (isJwtExpired 추가)
6. pnpm remove axios          (package.json 갱신)
7. pnpm tsc --noEmit          (검증)
```

### 10.2 Session Guide

**Module Map:**

| 모듈 | 파일 | 작업 |
|------|------|------|
| M1: errors.ts | `src/shared/api/errors.ts` | AxiosError → parseFetchError |
| M2: client.ts + index.ts | `src/shared/api/client.ts`, `index.ts` | axios → fetch wrapper |
| M3: AppShell + AppHeader | `src/widgets/app-shell/ui/AppShell.tsx`, `AppHeader.tsx` | setNavigateToLogin 제거 확인 |
| M4: proxy.ts | `proxy.ts` | isJwtExpired() 추가 |
| M5: package.json + tsc | `package.json` | pnpm remove axios + 검증 |

**추천 세션 분할:**
- **Single Session**: M1 → M2 → M3 → M4 → M5 — 전체 변경량 적음, 한 세션 완료 권장

```bash
/pdca do auth-refresh-token              # 전체 범위
/pdca do auth-refresh-token --scope M1,M2  # shared/api 먼저
/pdca do auth-refresh-token --scope M4,M5  # proxy.ts + axios 제거 나중에
```
