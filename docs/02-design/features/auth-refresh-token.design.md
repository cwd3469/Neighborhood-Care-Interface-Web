# [Design] auth-refresh-token

**작성일**: 2026-09-25
**상태**: Design 완료
**선택 아키텍처**: Option C — Pragmatic (proxy.ts + Route Handler)

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | access_token(1h) 만료 시 로그인 상태가 끊기는 문제 → refresh_token(7d)으로 silent 갱신 |
| **WHO** | 모든 역할(guardian/caregiver/admin) — 보호 라우트 접근 사용자 전체 |
| **RISK** | proxy.ts Edge Runtime에서 내부 Route Handler 호출 시 레이턴시 / set-cookie 헤더 전파 |
| **SUCCESS** | access_token 만료 후 새로고침 시 /login 이동 없이 정상 동작 |
| **SCOPE** | proxy.ts 수정 + /api/auth/refresh 신규 + login route의 refresh_token maxAge 수정 |

---

## 1. Overview

**선택 아키텍처: Option C — Pragmatic**

```
[보호 라우트 요청]
    ↓
proxy.ts (Edge Runtime)
    ├─ access_token 있음 → NextResponse.next() ✓
    ├─ access_token 없음 + refresh_token 없음 → /login redirect
    └─ access_token 없음 + refresh_token 있음
        ↓
        fetch('/api/auth/refresh', POST, Cookie 헤더 전달)
        ↓
app/api/auth/refresh/route.ts (Node.js Runtime)
        ├─ refresh_token 없음 → 401
        └─ FastAPI POST /refresh 호출
            ├─ 성공 → access_token 새로 set-cookie → 200 { ok: true }
            └─ 실패 → 401
        ↓
proxy.ts: set-cookie 헤더 전파
    ├─ /dashboard → user_role로 role별 redirect (쿠키 포함)
    └─ 기타 → NextResponse.next() (쿠키 포함)
```

**선택 이유:**
- Edge Runtime에서 외부 FastAPI 직접 호출 시 내부망 URL 문제 가능 → Route Handler(Node.js) 위임
- `/api/*`는 proxy.ts의 `config.matcher`에 없어 무한 루프 없음
- 추가 추상화(Option B) 없이 Plan R-02, R-03 요구사항 정확히 구현

---

## 2. 데이터 흐름

### 2.1 로그인 흐름 (수정)

```
LoginForm → POST /api/auth/login → FastAPI POST /login
→ { access_token, refresh_token, role }
→ Cookies:
    access_token  httpOnly, maxAge=3600   (1시간, 변경 없음)
    refresh_token httpOnly, maxAge=604800 (7일, 변경)
    user_role     httpOnly, maxAge=604800 (7일, 변경)
```

### 2.2 보호 라우트 접근 흐름 (신규 — refresh 경로)

```
GET /guardian/dashboard
  → proxy.ts
    → access_token 없음, refresh_token 있음
      → fetch POST /api/auth/refresh
        헤더: Cookie: refresh_token=<value>; user_role=<value>
        → route.ts: cookies().get('refresh_token')
        → FastAPI POST /refresh { Authorization: Bearer <refresh_token> }
        → 200: { access_token: "new_token", token_type: "bearer" }
        → response.cookies.set('access_token', 'new_token', { maxAge: 3600 })
        → 200 응답 (set-cookie 헤더 포함)
      → proxy.ts: refreshRes.headers.get('set-cookie')
      → NextResponse.next() + set-cookie 헤더 전파
  → 클라이언트: 새 access_token 쿠키 저장, 페이지 정상 로드
```

### 2.3 refresh 실패 흐름

```
GET /guardian/dashboard
  → proxy.ts: access_token 없음, refresh_token 있음
    → POST /api/auth/refresh
      → FastAPI /refresh → 401 (refresh_token 만료)
    → proxy.ts: refreshRes.ok === false
    → /login redirect
```

---

## 3. 파일별 설계

### 3.1 `app/api/auth/login/route.ts` — 수정

**변경 내용**: refresh_token, user_role의 maxAge를 1시간 → 7일로 분리

```typescript
// 변경 전
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60, // 모두 1시간
}

// 변경 후
const BASE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
}

const ACCESS_TOKEN_MAX_AGE = 60 * 60            // 1시간
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7 // 7일

response.cookies.set('access_token', responseData.access_token, {
  ...BASE_COOKIE_OPTIONS,
  maxAge: ACCESS_TOKEN_MAX_AGE,
})
response.cookies.set('refresh_token', responseData.refresh_token, {
  ...BASE_COOKIE_OPTIONS,
  maxAge: REFRESH_TOKEN_MAX_AGE,
})
response.cookies.set('user_role', responseData.role, {
  ...BASE_COOKIE_OPTIONS,
  maxAge: REFRESH_TOKEN_MAX_AGE,
})
```

### 3.2 `app/api/auth/refresh/route.ts` — 신규

```typescript
// Design Ref: §3.2 — Node.js Runtime에서 FastAPI /refresh 호출
// Plan SC: SC-01, SC-03
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

interface FastApiRefreshResponse {
  access_token: string
  token_type: string
}

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

  const data = (await res.json()) as FastApiRefreshResponse

  const response = NextResponse.json({ ok: true })
  response.cookies.set('access_token', data.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60, // 1시간
  })
  return response
}
```

**FastAPI 미구현 시 동작**: `process.env.API_URL/refresh`가 없거나 404 → `res.ok === false` → 401 반환 → proxy.ts가 /login으로 redirect. Graceful 처리.

### 3.3 `proxy.ts` — 수정

```typescript
// Design Ref: §3.3 — silent refresh + role 기반 redirect
// Plan SC: SC-01, SC-02, SC-04
import { NextResponse, type NextRequest } from 'next/server'

const ROLE_ROUTES: Record<string, string> = {
  guardian: '/guardian',
  caregiver: '/caregiver',
  admin: '/admin',
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const accessToken = request.cookies.get('access_token')?.value
  const refreshToken = request.cookies.get('refresh_token')?.value

  if (!accessToken) {
    // refresh_token 없음 → /login
    if (!refreshToken) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // refresh_token으로 갱신 시도
    const refreshUrl = new URL('/api/auth/refresh', request.url)
    const refreshRes = await fetch(refreshUrl.toString(), {
      method: 'POST',
      headers: {
        Cookie: request.headers.get('cookie') ?? '',
      },
    })

    if (!refreshRes.ok) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // 갱신 성공: 목적지 결정
    const destination =
      pathname === '/dashboard'
        ? (() => {
            const role = request.cookies.get('user_role')?.value
            return new URL((role && ROLE_ROUTES[role]) ?? '/login', request.url)
          })()
        : null

    const response = destination
      ? NextResponse.redirect(destination)
      : NextResponse.next()

    // set-cookie 전파 (새 access_token)
    const setCookie = refreshRes.headers.get('set-cookie')
    if (setCookie) {
      response.headers.set('set-cookie', setCookie)
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

export const config = {
  matcher: [
    '/dashboard',
    '/guardian/:path*',
    '/caregiver/:path*',
    '/admin/:path*',
  ],
}
```

---

## 4. 타입 정의

신규 타입 없음. 기존 `FastApiTokenResponse` 그대로 유지, `FastApiRefreshResponse`는 Route Handler 내부에만 정의.

---

## 5. 엣지 케이스 처리

| 케이스 | 처리 방법 |
|--------|----------|
| refresh_token 쿠키 존재하나 FastAPI에서 만료로 판단 | FastAPI 401 → route.ts 401 → proxy.ts /login redirect |
| set-cookie 헤더 없음 (route.ts 버그) | `setCookie`가 null → 헤더 세팅 스킵, NextResponse.next() 반환 — access_token 없이 진행되어 다음 요청에서 다시 refresh 시도 |
| /api/auth/refresh 자체가 매처에 포함? | `config.matcher`에 `/api/*` 없음 → 무한 루프 없음 |
| /dashboard에서 refresh 성공 시 redirect | user_role 쿠키는 7일 유효 → refresh 후에도 role redirect 정상 동작 |
| 동시 탭에서 동시 refresh 요청 | Edge Middleware는 요청별 독립 — 동시 refresh 요청이 여러 번 성공할 수 있음. FastAPI가 동일 refresh_token에 동일 access_token을 반환하면 문제 없음 |

---

## 6. 보안 고려사항

- **refresh_token httpOnly**: JS로 접근 불가 — XSS 방어 유지
- **sameSite: 'lax'**: CSRF 기본 보호
- **proxy.ts에서 Cookie 헤더 전달**: `request.headers.get('cookie')`로 전체 전달 — refresh_token 이외 쿠키도 포함되나 route.ts에서 `refresh_token`만 추출하므로 안전
- **새 access_token만 응답**: route.ts가 refresh_token을 rotation하지 않음 (단순화) — 추후 rotation 추가 가능

---

## 7. FastAPI 백엔드 계약 (Backend Contract)

```
POST /refresh
Headers:
  Authorization: Bearer <refresh_token>
  Content-Type: application/json

Response 200:
  { "access_token": "string", "token_type": "bearer" }

Response 401:
  { "detail": "Could not validate credentials" }
  또는 { "detail": "Token expired" }
```

백엔드 미구현 시 stub 처리 방법:
```python
# FastAPI stub
@router.post("/refresh")
async def refresh_token():
    raise HTTPException(status_code=401, detail="Not implemented")
```
→ proxy.ts가 401 수신 → /login redirect (graceful)

---

## 8. 성공 기준 검증 매핑

| Plan SC | 구현 위치 | 검증 방법 |
|---------|----------|----------|
| SC-01: access_token 만료 + refresh 있음 → 성공 | proxy.ts:13-35 | DevTools에서 access_token 쿠키 삭제 후 /guardian 접근 |
| SC-02: 둘 다 없음 → /login | proxy.ts:15-17 | 모든 쿠키 삭제 후 /guardian 접근 |
| SC-03: 쿠키 maxAge 분리 | login/route.ts | DevTools 쿠키 만료시간 확인 |
| SC-04: FastAPI 미구현 시 /login | refresh/route.ts:20-22 | mock 401 테스트 |
| SC-05: tsc 에러 없음 | 전체 | `pnpm tsc --noEmit` |

---

## 9. 의존성

신규 패키지 없음. 기존 의존성만 사용:
- `next/server`: `NextRequest`, `NextResponse` (proxy.ts)
- `next/headers`: `cookies()` (route.ts)

---

## 10. 미결 사항

| # | 항목 | 결정 필요자 |
|---|------|------------|
| M-01 | FastAPI `/refresh` 엔드포인트 구현 | 백엔드 팀 |
| M-02 | refresh_token rotation 여부 | 보안 정책 |
| M-03 | refresh 실패 시 `/login?expired=true` 쿼리 파라미터 추가 여부 | UX 결정 |

---

## 11. Implementation Guide

### 11.1 구현 순서

```
1. app/api/auth/login/route.ts 수정  (maxAge 분리)
2. app/api/auth/refresh/route.ts 신규 생성
3. proxy.ts 수정 (silent refresh 로직)
4. pnpm tsc --noEmit 검증
5. 수동 테스트 (DevTools 쿠키 조작)
```

### 11.2 테스트 시나리오

```
T1: 정상 로그인 → DevTools 쿠키 확인
  - access_token: 약 1시간 후 만료
  - refresh_token: 약 7일 후 만료

T2: access_token 수동 삭제 → /guardian 새로고침
  - refresh_token 있으면 → 페이지 정상 로드 + access_token 재발급 확인
  - (FastAPI 미구현 시) → /login redirect

T3: access_token + refresh_token 모두 삭제 → /guardian 접근
  - /login redirect 확인

T4: /dashboard → role별 redirect 확인
  - access_token 있음: 기존 동작 유지
  - access_token 없음, refresh 성공: role로 redirect
```

### 11.3 Session Guide

**Module Map:**

| 모듈 | 파일 | 작업 |
|------|------|------|
| M1: login maxAge | `app/api/auth/login/route.ts` | COOKIE_OPTIONS 분리 (3줄 변경) |
| M2: refresh Route | `app/api/auth/refresh/route.ts` | 신규 파일 (30줄) |
| M3: proxy silent refresh | `proxy.ts` | silent refresh 로직 추가 (20줄 변경) |

**추천 세션 분할:**
- **Single Session**: M1 + M2 + M3 모두 — 총 변경량 적음, 한 세션에 완료 권장

```bash
/pdca do auth-refresh-token           # 전체 범위
/pdca do auth-refresh-token --scope M1,M2  # Route Handler 먼저
/pdca do auth-refresh-token --scope M3     # proxy.ts 나중에
```
