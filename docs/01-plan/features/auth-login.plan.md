# [Plan] auth-login

> JWT 로그인 — httpOnly cookie + Next.js Route Handler proxy 패턴

**작성일**: 2026-09-19
**Feature**: auth-login

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 3개 대시보드에 인증 게이트 없음 — 미인증 상태로 모든 페이지 접근 가능, `api.setAuthToken()` stub만 있고 실제 토큰 취득 불가 |
| **Solution** | Next.js Route Handler가 FastAPI를 프록시해 httpOnly cookie 설정 → Server Component에서 `cookies()`로 직접 토큰 읽기 — XSS 안전 + RSC 친화적 |
| **Function UX Effect** | 로그인 성공 시 role에 따라 `/dashboard`로 리디렉션, `middleware.ts`가 미인증 접근 차단 |
| **Core Value** | "왜 httpOnly cookie인가", "Next.js Route Handler를 프록시로 쓰는 이유", "RSC에서 쿠키 읽기" — App Router 인증 패턴 면접 설명 가능 |

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 3개 대시보드 접근 전 인증 게이트 없음 → Milestone 4(대시보드 연동) 착수 전 선행 필요 |
| **WHO** | 프론트 5년차 — Next.js App Router Server/Client Component 패턴 이미 숙지 |
| **RISK** | 로컬 개발 시 CORS (localhost:3000 ↔ localhost:8000) + SameSite cookie 설정 / role 정보 쿠키 포함 방식 |
| **SUCCESS** | 로그인 폼 → Route Handler → FastAPI → httpOnly cookie 설정 → Server Component에서 token 읽기 성공 |
| **SCOPE** | 로그인 페이지만 — 회원가입/로그아웃/refresh token은 별도 feature |

---

## 1. 배경 및 목적

현재 상태:
- `src/shared/api/client.ts` — `setAuthToken(token)` stub 완료, 싱글톤 `api` 인스턴스 준비
- 보호 라우트 없음 — `/guardian`, `/caregiver`, `/admin` 미인증 접근 가능
- 백엔드 auth API: `POST /api/v1/auth/login` 존재

httpOnly cookie를 선택한 이유:
- XSS 공격으로 JS에서 토큰 탈취 불가
- Server Component에서 `cookies()`로 직접 읽기 가능 → RSC data fetch 패턴과 일치
- 단, 클라이언트에서 직접 읽기 불가 → Next.js Route Handler를 프록시로 사용

아키텍처 흐름:
```
[LoginForm] → POST /api/auth/login (Next.js RH) → POST /api/v1/auth/login (FastAPI)
                                                  ← { access_token, role }
             ← Set-Cookie: access_token=...; httpOnly + role=...
[middleware.ts] reads cookie → protect routes → redirect /dashboard by role
[Server Component] cookies().get('access_token') → Authorization header → FastAPI
```

---

## 2. 요구사항

### R-01: 로그인 페이지 라우트

```
app/
  login/
    page.tsx     # Server Component shell (메타데이터 + LoginForm 임포트)
    layout.tsx   # 인증 전용 레이아웃 (헤더 없음)
```

### R-02: LoginForm UI (`src/features/auth-login/`)

FSD 구조:
```
src/features/auth-login/
  ui/
    LoginForm.tsx    # 'use client' — email/password form
  api/
    login.ts         # POST /api/auth/login (Next.js RH 호출)
  model/
    useLogin.ts      # 로그인 상태 관리 훅
  index.ts           # public API
```

`LoginForm.tsx` 요구사항:
- email + password 입력 필드
- 제출 시 로딩 상태 표시
- 에러 메시지 인라인 표시 (잘못된 자격증명 등)
- 성공 시 `router.push('/dashboard')` 또는 `router.refresh()`

### R-03: Next.js Route Handler (`app/api/auth/login/route.ts`)

```typescript
// Plan SC: R-03 — FastAPI 프록시, httpOnly cookie 설정
export async function POST(request: Request) {
  const body = await request.json()

  // FastAPI 호출
  const res = await fetch(process.env.API_URL + '/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const error = await res.json()
    return NextResponse.json(error, { status: res.status })
  }

  const { access_token, role } = await res.json()

  const response = NextResponse.json({ ok: true })
  response.cookies.set('access_token', access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60,  // 1시간
  })
  response.cookies.set('user_role', role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60,
  })
  return response
}
```

> **⚠️ 중요**: `API_URL`은 서버 전용 환경변수 (NEXT_PUBLIC_ 없음) — Route Handler는 서버에서 실행

### R-04: middleware.ts

```typescript
// 보호 경로: /guardian, /caregiver, /admin, /dashboard
// 공개 경로: /login, /api/auth/*
export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')
  const role = request.cookies.get('user_role')
  const { pathname } = request.nextUrl

  // 미인증 → /login 리디렉션
  if (!token && isProtectedRoute(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // /dashboard → role별 리디렉션
  if (pathname === '/dashboard' && role) {
    const dest = ROLE_ROUTES[role.value] ?? '/login'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  return NextResponse.next()
}
```

역할-경로 매핑:
- `guardian` → `/guardian`
- `caregiver` → `/caregiver`
- `admin` → `/admin`

### R-05: Server Component 인증 유틸 (`src/shared/api/server.ts`)

```typescript
// Server Component에서 인증된 FastAPI 호출용
import { cookies } from 'next/headers'

export function getServerApiHeaders(): HeadersInit {
  const token = cookies().get('access_token')?.value
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export const SERVER_API_URL = process.env.API_URL ?? ''
```

사용 예시:
```typescript
// app/guardian/page.tsx (Server Component)
import { getServerApiHeaders, SERVER_API_URL } from '@shared/api/server'

const res = await fetch(SERVER_API_URL + '/patients', {
  headers: getServerApiHeaders(),
})
```

### R-06: 환경변수 추가

`.env.local.example`에 추가:
```
# 서버 전용 (Route Handler, Server Component에서만 사용)
API_URL=http://localhost:8000
```

> 기존 `NEXT_PUBLIC_API_URL` (Client Component용)과 별도 관리

### R-07: 대시보드 진입점

```
app/
  dashboard/
    page.tsx   # 리디렉션 전용 — middleware가 처리하지만 fallback용
  guardian/
    page.tsx   # (빈 Shell — Milestone 4에서 채움)
  caregiver/
    page.tsx   # (빈 Shell — Milestone 4에서 채움)
  admin/
    page.tsx   # (빈 Shell — Milestone 4에서 채움)
```

---

## 3. 성공 기준 (Success Criteria)

| # | 기준 | 검증 방법 |
|---|------|----------|
| SC-01 | `/login` 페이지 렌더링 | 브라우저 접속 |
| SC-02 | 잘못된 자격증명 → 에러 메시지 인라인 표시 | 틀린 패스워드 입력 |
| SC-03 | 로그인 성공 → httpOnly `access_token` cookie 설정 | DevTools > Application > Cookies |
| SC-04 | 로그인 성공 → `/dashboard` → role 경로로 리디렉션 | guardian 계정 → `/guardian` 확인 |
| SC-05 | 미인증 상태로 `/guardian` 접근 → `/login` 리디렉션 | 직접 URL 입력 |
| SC-06 | Server Component에서 `getServerApiHeaders()` 토큰 읽기 | `/guardian` 페이지에서 API 호출 테스트 |
| SC-07 | `API_URL` 서버 환경변수 분리 | 브라우저 네트워크 탭에서 미노출 확인 |

---

## 4. 리스크

| 리스크 | 심각도 | 대응 |
|--------|--------|------|
| 로컬 CORS — `localhost:3000` → Route Handler → `localhost:8000` | 낮음 | Route Handler가 서버에서 호출하므로 CORS 불필요 (same-origin 아님) |
| `sameSite: 'lax'` + 다른 도메인 배포 | 중 | 프로덕션 배포 시 `sameSite: 'none'` + `secure: true` 조건부 설정 |
| role 정보 쿠키 위조 | 중 | middleware는 role cookie로 라우팅만, 실제 권한 검증은 FastAPI에서 수행 |
| refresh token 없음 (1시간 만료) | 저 | 이번 scope 외 — 만료 시 자동 `/login` 리디렉션으로 처리 |

---

## 5. 범위 밖 (Out of Scope)

- 회원가입 페이지 — 별도 feature
- 로그아웃 (cookie 삭제 + 리디렉션) — 별도 feature 또는 다음 iteration
- Refresh token — 별도 feature
- 소셜 로그인 — Milestone 이후
- 각 역할별 대시보드 UI — Milestone 4
