# [Plan] auth-refresh-token

> proxy.ts JWT expiry 체크 + axios 제거 + fetch 통일

**작성일**: 2026-10-09
**상태**: Plan 완료 (v2 — 기존 플랜 전면 개정)

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | proxy.ts가 access_token 쿠키 존재만 확인 — JWT 만료 여부 미검사 → 만료 토큰이 Server Component에 전달되어 FastAPI 401 발생 가능. 동시에 axios/fetch 이중 구조 존재 |
| **Solution** | proxy.ts에 JWT expiry decode 추가(proactive refresh), axios 완전 제거 후 native fetch 통일 |
| **Function UX Effect** | Server Component에서 FastAPI 401 없이 항상 유효한 토큰 보장. 7일 이내 재방문 시 로그인 상태 유지 |
| **Core Value** | 단일 fetch 코드베이스 — Client/Server Component 모두 동일한 인증 흐름, 유지보수 단순화 |

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

## 1. 현재 상태 분석

### 1.1 이미 구현된 것

```
app/api/auth/refresh/route.ts     ✅ refresh_token → FastAPI → 새 access_token 쿠키
app/api/auth/login/route.ts       ✅ access_token(1h) / refresh_token(7d) maxAge 분리
proxy.ts                          ✅ !accessToken → refresh 시도 or /login 리디렉션
```

### 1.2 문제점

**proxy.ts의 현재 로직:**
```
access_token 쿠키 있음 → NextResponse.next()  ← JWT 만료 여부 미확인
access_token 쿠키 없음 → refresh 시도
```

**문제 시나리오:**
```
1. access_token 쿠키 maxAge=1h → 브라우저가 쿠키 유지
2. 하지만 FastAPI 서버 기준으로 JWT exp 만료
3. proxy.ts: 쿠키 있음 → 통과
4. Server Component: FastAPI 호출 → 401 → throw Error → 페이지 crash
```

**axios 사용처 (2개 파일만):**
```
AppShell.tsx:  api.get<AuthUser>('/api/auth/me')
AppHeader.tsx: api.post('/api/auth/logout')
```

---

## 2. 해결 방법

### 2.1 proxy.ts — JWT Expiry Proactive Check

```
access_token 쿠키 있음 + JWT 만료 → refresh 시도 (proactive)
access_token 쿠키 있음 + JWT 유효 → 통과 (기존)
access_token 쿠키 없음 → refresh 시도 (기존)
```

**Edge Runtime에서 JWT decode (라이브러리 없이):**
```typescript
function isJwtExpired(token: string): boolean {
  try {
    // base64url → base64 padding 보정
    const payload = token.split('.')[1];
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const decoded = JSON.parse(atob(padded)) as { exp?: number };
    if (!decoded.exp) return false;
    return decoded.exp * 1000 < Date.now();
  } catch {
    return true; // decode 실패 → 만료로 간주
  }
}
```

### 2.2 client.ts — axios → native fetch + 401 retry

```typescript
// 401 retry 패턴 (axios interceptor 대체)
async function clientFetch(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, init);
  if (res.status !== 401) return res;

  // refresh 시도
  const refreshRes = await fetch('/api/auth/refresh', { method: 'POST' });
  if (!refreshRes.ok) {
    window.location.href = '/login';
    return refreshRes;
  }

  // 재시도
  return fetch(url, init);
}

export const api = {
  get:    <T>(url: string) => clientFetch(url).then(r => parseResponse<T>(r)),
  post:   <T>(url: string, data?: unknown) =>
    clientFetch(url, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(data) })
      .then(r => parseResponse<T>(r)),
  // ... put, patch, delete
};
```

### 2.3 AppShell / AppHeader

```typescript
// AppShell.tsx (before)
api.get<AuthUser>('/api/auth/me').then(setStoreLogin).catch(...)

// AppShell.tsx (after)
fetch('/api/auth/me')
  .then(r => r.ok ? r.json() : Promise.reject())
  .then(setStoreLogin)
  .catch(...)

// AppHeader.tsx (before)
await api.post('/api/auth/logout')

// AppHeader.tsx (after)
await fetch('/api/auth/logout', { method: 'POST' })
```

---

## 3. 요구사항

### R-01: `proxy.ts` — JWT expiry 체크 추가

- `isJwtExpired(token)` 헬퍼 함수 추가
- `accessToken` 있을 때 `isJwtExpired` 체크
- 만료 시 기존 `!accessToken` 브랜치와 동일 로직(refresh 시도) 수행
- 기존 동작(`!accessToken` → refresh, `pathname === '/dashboard'` redirect) 유지

### R-02: `src/shared/api/client.ts` — axios 제거

- `axios` import 제거
- `clientFetch(url, init)` — native fetch + 401 → refresh → retry
- `parseResponse<T>(res: Response)` — `res.ok` 체크, 실패 시 `ApiError` throw
- `setNavigateToLogin` 함수 제거 (proxy.ts가 서버에서 처리)
- `api.get/post/put/patch/delete` 인터페이스 유지

### R-03: `src/shared/api/errors.ts` — AxiosError 제거

- `AxiosError` 타입 의존성 제거
- `parseAxiosError` → `parseFetchError(res: Response, body?: unknown)` 로 교체
- `ApiError` 타입 유지 (`types.ts`)

### R-04: `src/shared/api/index.ts` — setNavigateToLogin 제거

- `setNavigateToLogin` export 제거

### R-05: `AppShell.tsx` / `AppHeader.tsx` — api.* → fetch

- `import { api } from "@shared/api"` 제거
- `api.get/post` → native `fetch` 직접 호출

### R-06: `package.json` — axios 제거

- `pnpm remove axios`

---

## 4. 파일 계획

**수정:**
```
proxy.ts                                    ← R-01: JWT expiry 체크
src/shared/api/client.ts                    ← R-02: axios → fetch
src/shared/api/errors.ts                    ← R-03: AxiosError → Response 기반
src/shared/api/index.ts                     ← R-04: setNavigateToLogin 제거
src/widgets/app-shell/ui/AppShell.tsx       ← R-05: api.get → fetch
src/widgets/app-shell/ui/AppHeader.tsx      ← R-05: api.post → fetch
package.json                                ← R-06: axios 제거
```

**변경 없음:**
```
app/api/auth/refresh/route.ts    (이미 완성)
app/api/auth/login/route.ts      (이미 완성)
app/api/auth/me/route.ts         (변경 없음)
src/shared/api/server.ts         (변경 없음)
src/shared/api/types.ts          (ApiError 타입 유지)
```

---

## 5. 성공 기준

| # | 기준 | 검증 |
|---|------|------|
| SC-01 | proxy.ts JWT 만료 토큰 감지 → refresh 시도 | isJwtExpired() 코드 검토 |
| SC-02 | AppShell /api/auth/me 정상 동작 (axios 없이) | 코드 검토 |
| SC-03 | AppHeader /api/auth/logout 정상 동작 (axios 없이) | 코드 검토 |
| SC-04 | `pnpm tsc --noEmit` 에러 없음 | TypeScript 검증 |
| SC-05 | `node_modules/axios` 없음 | package.json 확인 |

---

## 6. 리스크

| 리스크 | 심각도 | 대응 |
|--------|--------|------|
| atob padding 오류로 decode 실패 | 중 | try/catch에서 true 반환 → refresh 시도 (안전 방향) |
| client.ts api 인터페이스 변경 시 다른 사용처 영향 | 저 | AppShell/AppHeader만 사용 확인됨 |
| fetch 401 retry 무한 루프 | 저 | `_retried` 플래그로 1회만 retry |

---

## 7. 범위 밖

- `server.ts` `getServerApiHeaders()` 수정 — proxy.ts proactive refresh로 충분
- refresh_token rotation
- 동시 탭 경쟁 조건 처리
- `/api/auth/me` 응답에서 401 → 자동 redirect (proxy.ts가 이미 처리)

---

## 8. 다음 단계

- `/pdca design auth-refresh-token`
