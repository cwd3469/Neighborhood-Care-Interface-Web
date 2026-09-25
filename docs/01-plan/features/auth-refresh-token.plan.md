# [Plan] auth-refresh-token

> proxy.ts에서 access_token 만료 시 refresh_token으로 자동 갱신

**작성일**: 2026-09-25
**상태**: Plan 완료
**전제**: auth-login v1 완료 (httpOnly cookie, proxy.ts 보호 라우트)

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | access_token(1h) 만료 시 로그인 상태가 끊기고 /login으로 강제 이동 — refresh_token이 있어도 미활용 |
| **Solution** | proxy.ts에서 access_token 없음 감지 → refresh_token으로 `/api/auth/refresh` 호출 → 새 토큰 쿠키 세팅 후 원래 페이지 진행 |
| **Function UX Effect** | 7일 이내 재방문 시 로그인 상태 유지, 세션 만료 없는 연속적 UX |
| **Core Value** | Edge Middleware(proxy.ts)에서 silent refresh — Client Component 변경 없이 전역 적용 |

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | access_token(1h) 만료 후 사용자가 로그아웃되는 문제 → refresh_token(7d)으로 silent 갱신 |
| **WHO** | 모든 역할(guardian/caregiver/admin) — 보호 라우트 접근 사용자 전체 |
| **RISK** | proxy.ts Edge Runtime에서 내부 Route Handler 호출 제약 / 토큰 동시 갱신 경쟁 조건 |
| **SUCCESS** | access_token 만료 후 페이지 새로고침 시 /login 이동 없이 정상 동작 |
| **SCOPE** | proxy.ts 수정 + /api/auth/refresh 추가 + login route의 refresh_token maxAge 수정 — logout 별도 |

---

## 1. 배경

**현재 문제점:**

```
app/api/auth/login/route.ts (line 34-40):
  COOKIE_OPTIONS = { maxAge: 60 * 60 }  // 1시간
  → access_token과 refresh_token 둘 다 1시간 — refresh 의미 없음

proxy.ts (line 15-17):
  const token = request.cookies.get('access_token')?.value
  if (!token) return NextResponse.redirect('/login')
  → access_token 없으면 바로 /login — refresh 시도 없음
```

**목표 흐름:**

```
proxy.ts:
  access_token 있음 → 통과
  access_token 없음 + refresh_token 있음 → /api/auth/refresh 호출
    → 성공: 새 access_token 쿠키 세팅 + 원래 요청 통과
    → 실패: /login 리디렉션
  access_token 없음 + refresh_token 없음 → /login 리디렉션
```

---

## 2. 아키텍처

```
[사용자 보호 라우트 접근]
  ↓
proxy.ts
  ├─ access_token 있음? → NextResponse.next() (기존 로직 유지)
  └─ access_token 없음?
      ├─ refresh_token 없음? → /login 리디렉션
      └─ refresh_token 있음?
          ↓
          fetch('/api/auth/refresh', { method: 'POST', headers: { Cookie: ... } })
          ├─ 200 응답: { access_token, user_role }
          │    → response.cookies.set('access_token', ...)
          │    → NextResponse.next() with updated cookies
          └─ 401/500: /login 리디렉션

[app/api/auth/refresh/route.ts]
  → httpOnly cookie에서 refresh_token 읽기
  → FastAPI POST /refresh 호출
  → 성공: 새 access_token 쿠키 세팅 + { ok: true } 반환
  → 실패: 401 반환
```

**proxy.ts에서 Route Handler를 호출하는 이유:**
- Edge Runtime에서 Node.js crypto, process.env 제약 우회
- Route Handler는 Node.js Runtime → FastAPI 호출 안정적
- 관심사 분리: proxy.ts = 라우팅 결정, Route Handler = 토큰 갱신 로직

---

## 3. 요구사항

### R-01: `app/api/auth/login/route.ts` 수정 — refresh_token maxAge

```typescript
const ACCESS_TOKEN_MAXAGE = 60 * 60;        // 1시간
const REFRESH_TOKEN_MAXAGE = 60 * 60 * 24 * 7; // 7일

response.cookies.set('access_token', responseData.access_token, {
  ...BASE_COOKIE_OPTIONS,
  maxAge: ACCESS_TOKEN_MAXAGE,
});
response.cookies.set('refresh_token', responseData.refresh_token, {
  ...BASE_COOKIE_OPTIONS,
  maxAge: REFRESH_TOKEN_MAXAGE,
});
response.cookies.set('user_role', responseData.role, {
  ...BASE_COOKIE_OPTIONS,
  maxAge: REFRESH_TOKEN_MAXAGE, // role도 refresh_token과 동일
});
```

### R-02: `app/api/auth/refresh/route.ts` 신규

```typescript
// app/api/auth/refresh/route.ts
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST() {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get('refresh_token')?.value

  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 })
  }

  const res = await fetch(`${process.env.API_URL}/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${refreshToken}`,
    },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Refresh failed' }, { status: 401 })
  }

  const data = await res.json()  // { access_token, token_type }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('access_token', data.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60,
  })
  return response
}
```

> FastAPI `/refresh` 엔드포인트가 미구현인 경우, 백엔드 구현 전까지 stub으로 동작.

### R-03: `proxy.ts` 수정 — silent refresh 로직 추가

```typescript
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const accessToken = request.cookies.get('access_token')?.value
  const refreshToken = request.cookies.get('refresh_token')?.value

  // access_token 없음
  if (!accessToken) {
    // refresh_token도 없음 → /login
    if (!refreshToken) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // refresh_token으로 갱신 시도
    const refreshUrl = new URL('/api/auth/refresh', request.url)
    const refreshRes = await fetch(refreshUrl, {
      method: 'POST',
      headers: { Cookie: request.headers.get('cookie') ?? '' },
    })

    if (!refreshRes.ok) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // 새 access_token 쿠키를 응답에 전파
    const newAccessToken = refreshRes.headers.get('set-cookie')
    const response =
      pathname === '/dashboard'
        ? (() => {
            const role = request.cookies.get('user_role')?.value
            const dest = (role && ROLE_ROUTES[role]) ?? '/login'
            return NextResponse.redirect(new URL(dest, request.url))
          })()
        : NextResponse.next()

    if (newAccessToken) {
      response.headers.set('set-cookie', newAccessToken)
    }
    return response
  }

  // access_token 있음 — 기존 로직
  if (pathname === '/dashboard') {
    const role = request.cookies.get('user_role')?.value
    const dest = (role && ROLE_ROUTES[role]) ?? '/login'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  return NextResponse.next()
}
```

### R-04: FastAPI `/refresh` 엔드포인트 (백엔드 의존)

FastAPI에서 구현 필요:
```
POST /refresh
Authorization: Bearer <refresh_token>
→ 200: { access_token: string, token_type: "bearer" }
→ 401: refresh_token 만료 또는 유효하지 않음
```

백엔드 미구현 시: `/api/auth/refresh` Route Handler가 401을 반환하면 proxy.ts가 /login으로 리디렉션.

---

## 4. 파일 계획

```
신규 1개:
  app/api/auth/refresh/route.ts       refresh Route Handler

수정 2개:
  app/api/auth/login/route.ts         refresh_token maxAge → 7일
  proxy.ts                            silent refresh 로직 추가

변경 없음:
  app/api/auth/me/route.ts  src/shared/api/server.ts
  src/features/auth-login/  app/providers.tsx
```

---

## 5. 성공 기준 (Success Criteria)

| # | 기준 | 검증 방법 |
|---|------|----------|
| SC-01 | access_token 만료(쿠키 삭제) + refresh_token 있으면 보호 라우트 접근 성공 | DevTools에서 access_token 쿠키 삭제 후 새로고침 |
| SC-02 | access_token + refresh_token 둘 다 없으면 /login 리디렉션 | 모든 쿠키 삭제 후 /guardian 접근 |
| SC-03 | 로그인 후 access_token maxAge=1h, refresh_token maxAge=7d | DevTools 쿠키 만료 시간 확인 |
| SC-04 | FastAPI /refresh 미구현 시 (혹은 401 반환 시) /login 리디렉션 | /api/auth/refresh mock 401 테스트 |
| SC-05 | `pnpm tsc --noEmit` 에러 없음 | TypeScript 검증 |

---

## 6. 리스크

| 리스크 | 심각도 | 대응 |
|--------|--------|------|
| proxy.ts에서 /api/auth/refresh 내부 호출 시 무한 루프 | 높음 | /api/* 경로는 proxy matcher에서 제외됨 (현재 config.matcher에 없음) |
| FastAPI /refresh 미구현 | 중 | 401 반환 → /login 리디렉션으로 graceful 처리 |
| set-cookie 헤더 전파 누락 | 중 | refreshRes headers 검증 + 통합 테스트 |
| 토큰 갱신 동시 요청 경쟁 | 저 | Edge Middleware는 단일 요청 처리 — 동시 탭 이슈는 추후 개선 |

---

## 7. 범위 밖 (Out of Scope)

- 로그아웃 시 refresh_token 무효화 (별도 feature)
- 동시 탭에서의 토큰 갱신 경쟁 조건 처리
- refresh_token rotation (갱신 시 refresh_token도 새로 발급)
- 토큰 만료 전 proactive refresh (현재: 만료 후 반응형)

---

## 8. 다음 단계

- `/pdca design auth-refresh-token`
