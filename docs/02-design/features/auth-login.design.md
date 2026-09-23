# [Design] auth-login

> Option C — Pragmatic: FSD ui/api/model + Route Handler proxy + Server utility

**작성일**: 2026-09-19
**Feature**: auth-login
**선택된 아키텍처**: Option C (Pragmatic)

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 3개 대시보드 인증 게이트 없음 → Milestone 4 착수 전 선행 필요 |
| **WHO** | 프론트 5년차 — App Router Server/Client 패턴 이미 숙지 |
| **RISK** | 로컬 CORS / `sameSite` cookie 설정 / role cookie 위조 시 라우팅 오동작 |
| **SUCCESS** | 로그인 → httpOnly cookie → `/dashboard` → role 리디렉션 → RSC에서 토큰 읽기 |
| **SCOPE** | 로그인만 — 회원가입/로그아웃/refresh token은 별도 |

---

## 1. 전체 아키텍처 흐름

```
[LoginForm]  →  useLogin()  →  login() [api/login.ts]
                                  ↓
                          POST /api/auth/login    (Next.js Route Handler)
                                  ↓
                          POST /api/v1/auth/login (FastAPI)
                                  ↓
                          { access_token, token_type, role }
                                  ↓
                   Set-Cookie: access_token (httpOnly)
                   Set-Cookie: user_role    (httpOnly)
                                  ↓
                         router.push('/dashboard')
                                  ↓
                     middleware.ts reads user_role
                                  ↓
               redirect → /guardian | /caregiver | /admin


[Server Component]  →  getServerApiHeaders()  →  cookies().get('access_token')
                                                   ↓
                                          Authorization: Bearer <token>
                                                   ↓
                                          fetch(SERVER_API_URL + '/patients', ...)
```

---

## 2. 파일 구조

```
src/
  features/
    auth-login/
      ui/
        LoginForm.tsx      # 'use client' — form + error state
      api/
        login.ts           # POST /api/auth/login 호출 + 응답 타입
      model/
        useLogin.ts        # useState(pending/error) + login() + router.push
      index.ts             # export { LoginForm }
  shared/
    api/
      server.ts            # getServerApiHeaders() + SERVER_API_URL (신규)
      index.ts             # 기존 유지 (Client Component용 api 싱글톤)

app/
  login/
    page.tsx               # Server Component shell (metadata + LoginForm)
    layout.tsx             # 인증 전용 레이아웃
  api/
    auth/
      login/
        route.ts           # POST Route Handler: FastAPI 프록시 + cookie 설정
  dashboard/
    page.tsx               # /dashboard → 진입점 (middleware가 role 리디렉션)
  guardian/
    page.tsx               # Shell (Milestone 4에서 채움)
  caregiver/
    page.tsx               # Shell
  admin/
    page.tsx               # Shell

middleware.ts              # 보호 라우트 + role 리디렉션
```

---

## 3. 각 파일 상세 설계

### 3.1 `src/features/auth-login/api/login.ts`

```typescript
// Design Ref: §3.1 — Next.js Route Handler 프록시 호출
export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResult {
  ok: boolean
  error?: string
}

export async function loginApi(body: LoginRequest): Promise<LoginResult> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return { ok: false, error: data.detail ?? '로그인에 실패했습니다.' }
  }

  return { ok: true }
}
```

### 3.2 `src/features/auth-login/model/useLogin.ts`

```typescript
// Design Ref: §3.2 — 로그인 상태 관리 훅
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginApi, type LoginRequest } from '../api/login'

export function useLogin() {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = async (data: LoginRequest) => {
    setIsPending(true)
    setError(null)
    const result = await loginApi(data)
    setIsPending(false)

    if (!result.ok) {
      setError(result.error ?? '로그인 실패')
      return
    }
    router.push('/dashboard')
  }

  return { login, isPending, error }
}
```

### 3.3 `src/features/auth-login/ui/LoginForm.tsx`

```typescript
// Design Ref: §3.3 — 로그인 폼 UI
'use client'
import { useLogin } from '../model/useLogin'

export function LoginForm() {
  const { login, isPending, error } = useLogin()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    login({ email, password })
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" required placeholder="이메일" />
      <input name="password" type="password" required placeholder="비밀번호" />
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={isPending}>
        {isPending ? '로그인 중...' : '로그인'}
      </button>
    </form>
  )
}
```

> UI 스타일은 Do 단계에서 Tailwind 클래스 적용

### 3.4 `app/api/auth/login/route.ts`

```typescript
// Design Ref: §3.4 — FastAPI 프록시 + httpOnly cookie 설정
// Plan SC: R-03 — httpOnly cookie, sameSite lax
import { NextResponse } from 'next/server'

interface FastApiTokenResponse {
  access_token: string
  token_type: string
  role: string  // 'guardian' | 'caregiver' | 'admin'
}

export async function POST(request: Request) {
  const body = await request.json()

  const res = await fetch(
    `${process.env.API_URL}/api/v1/auth/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: '인증 실패' }))
    return NextResponse.json(error, { status: res.status })
  }

  const { access_token, role } = (await res.json()) as FastApiTokenResponse

  const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60,  // 1시간
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('access_token', access_token, COOKIE_OPTIONS)
  response.cookies.set('user_role', role, COOKIE_OPTIONS)
  return response
}
```

### 3.5 `middleware.ts` (프로젝트 루트)

```typescript
// Design Ref: §3.5 — 보호 라우트 + role 기반 리디렉션
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PATHS = ['/guardian', '/caregiver', '/admin', '/dashboard']
const ROLE_ROUTES: Record<string, string> = {
  guardian: '/guardian',
  caregiver: '/caregiver',
  admin: '/admin',
}

function isProtected(pathname: string) {
  return PROTECTED_PATHS.some(p => pathname.startsWith(p))
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('access_token')
  const role = request.cookies.get('user_role')?.value

  if (!token && isProtected(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (pathname === '/dashboard' && role) {
    const dest = ROLE_ROUTES[role] ?? '/login'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard', '/guardian/:path*', '/caregiver/:path*', '/admin/:path*'],
}
```

### 3.6 `src/shared/api/server.ts`

```typescript
// Design Ref: §3.6 — Server Component용 인증 헤더 유틸
// Plan SC: R-05, SC-06
import { cookies } from 'next/headers'

export const SERVER_API_URL = process.env.API_URL ?? ''

export function getServerApiHeaders(): HeadersInit {
  const token = cookies().get('access_token')?.value
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}
```

### 3.7 `app/login/page.tsx`

```typescript
import type { Metadata } from 'next'
import { LoginForm } from '@features/auth-login'

export const metadata: Metadata = { title: '로그인 — 시니어 케어' }

export default function LoginPage() {
  return (
    <main>
      <h1>시니어 케어 매니저</h1>
      <LoginForm />
    </main>
  )
}
```

---

## 4. 데이터 흐름 다이어그램

```
Browser           Next.js (Server)          FastAPI
   |                    |                      |
   | POST /api/auth/    |                      |
   |   login            |                      |
   |------------------->|                      |
   |                    | POST /api/v1/auth/   |
   |                    |   login              |
   |                    |--------------------->|
   |                    |                      |
   |                    | { access_token,      |
   |                    |   role }             |
   |                    |<---------------------|
   |                    |                      |
   | Set-Cookie:        |                      |
   |   access_token     |                      |
   |   user_role        |                      |
   |<-------------------|                      |
   |                    |                      |
   | GET /dashboard     |                      |
   |------------------->|                      |
   |                    | middleware: role=     |
   |                    |   guardian →          |
   | 302 /guardian      |                      |
   |<-------------------|                      |
```

---

## 5. 환경변수

| 변수 | 위치 | 설명 |
|------|------|------|
| `API_URL` | 서버 전용 (`process.env.API_URL`) | FastAPI 서버 URL, Route Handler + `server.ts`에서 사용 |
| `NEXT_PUBLIC_API_URL` | 클라이언트 (`process.env.NEXT_PUBLIC_API_URL`) | 기존 `shared/api` 싱글톤용, 변경 없음 |

`.env.local.example`에 추가:
```
# 서버 전용 (Route Handler, Server Component)
API_URL=http://localhost:8000
```

---

## 6. 의존성 추가 불필요

별도 패키지 설치 없음 — Next.js 내장 기능만 사용:
- `next/headers` → `cookies()`
- `next/navigation` → `useRouter()`
- `next/server` → `NextResponse`, `NextRequest`

---

## 7. FSD 레이어 준수

```
app/ (pages)
  ↓
features/auth-login  (LoginForm 임포트)
  ↓
shared/api/server    (getServerApiHeaders)
  ↓
shared/api/index     (기존, 변경 없음)
```

Cross-layer 위반 없음. `features/auth-login`은 `shared/api/server`를 사용하지 않음 (서버 전용).

---

## 8. 리스크 대응

| 리스크 | 설계 대응 |
|--------|----------|
| `API_URL` 환경변수 미설정 | `?? ''` fallback + 실패 시 500 반환으로 명확한 에러 |
| `user_role` cookie 위조로 잘못된 대시보드 진입 | middleware는 라우팅만, 실제 데이터 접근은 FastAPI에서 JWT 검증 |
| cookie 만료(1시간) 후 API 호출 실패 | 401 응답 시 middleware가 다음 요청에서 `/login` 리디렉션 |

---

## 9. 구현 순서

Module Map:

| 모듈 | 파일 | 설명 |
|------|------|------|
| **M1** Foundation | `middleware.ts`, `app/dashboard/page.tsx`, Shell pages, `.env.local.example` | 라우트 보호 먼저 |
| **M2** Route Handler | `app/api/auth/login/route.ts` | FastAPI 프록시 핵심 |
| **M3** Feature API+Model | `src/features/auth-login/api/login.ts`, `model/useLogin.ts` | 비즈니스 로직 |
| **M4** Feature UI+Page | `src/features/auth-login/ui/LoginForm.tsx`, `index.ts`, `app/login/page.tsx`, `layout.tsx` | UI 연결 |
| **M5** Server Util | `src/shared/api/server.ts` | RSC 유틸 |

### 11.3 Session Guide

**전체 한 세션 권장** (파일 ~11개, ~250줄 예상)

```
Session 1 (전체):
  M1 → M2 → M3 → M4 → M5

또는 분할 시:
  Session 1: M1 + M2 (인프라)     /pdca do auth-login --scope M1,M2
  Session 2: M3 + M4 + M5 (기능)  /pdca do auth-login --scope M3,M4,M5
```
