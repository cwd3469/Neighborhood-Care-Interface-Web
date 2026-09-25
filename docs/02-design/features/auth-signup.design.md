# [Design] auth-signup

> Option C — Pragmatic: auth-login 패턴 mirror — api/signup.ts + useSignup.ts + SignupForm.tsx

**작성일**: 2026-09-25
**Feature**: auth-signup
**선택된 아키텍처**: Option C (Pragmatic)

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | guardian(보호자)이 서비스에 가입할 방법 없음 — 로그인 페이지에 진입점도 없는 상태 |
| **WHO** | 프론트 5년차 — auth-login 패턴 이미 구현 완료 |
| **RISK** | 이메일 중복(409/422) 에러 처리, 비밀번호 확인 불일치 프론트 유효성 |
| **SUCCESS** | guardian이 가입 후 `/login`으로 이동, 로그인 → `/guardian` 접근 가능 |
| **SCOPE** | guardian 자유 가입만 — caregiver/admin 초대 가입, 이메일 인증, 로그아웃 별도 |

---

## 1. 전체 아키텍처 흐름

```
[SignupForm]  →  useSignup()  →  signupApi() [api/signup.ts]
                                     ↓
                         POST /api/auth/signup    (Next.js Route Handler)
                                     ↓
                         POST /api/v1/auth/signup (FastAPI)
                                     ↓
                               201 Created
                                     ↓
                          router.push('/login')


[SignupForm] passwordConfirm 불일치 → submit 차단, 인라인 에러 표시 (FastAPI 호출 없음)
```

auth-login과의 대칭:
```
auth-login:  api/login.ts    → model/useLogin.ts    → ui/LoginForm.tsx    → /dashboard
auth-signup: api/signup.ts   → model/useSignup.ts   → ui/SignupForm.tsx   → /login
```

---

## 2. 파일 구조

```
신규:
  src/features/auth-signup/
    api/
      signup.ts            # POST /api/auth/signup 래퍼
    model/
      useSignup.ts         # useState (isPending/error) + router.push('/login')
    ui/
      SignupForm.tsx        # 'use client' — 4 fields + passwordConfirm 인라인 검증
    index.ts               # public API: SignupForm

  app/signup/
    page.tsx               # Server Component shell (metadata + SignupForm)
    layout.tsx             # auth-login layout과 동일 구조

  app/api/auth/signup/
    route.ts               # POST Route Handler: role 고정 주입 → FastAPI 프록시

수정:
  app/login/page.tsx       # (또는 LoginForm.tsx) — 회원가입 링크 추가
```

---

## 3. 각 파일 상세 설계

### 3.1 `src/features/auth-signup/api/signup.ts`

```typescript
// Design Ref: §3.1 — Next.js Route Handler 프록시 호출
export interface SignupRequest {
  name: string
  email: string
  password: string
}

export interface SignupResult {
  ok: boolean
  error?: string
}

export async function signupApi(body: SignupRequest): Promise<SignupResult> {
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return { ok: false, error: data.detail ?? '회원가입에 실패했습니다.' }
  }

  return { ok: true }
}
```

> `role`은 클라이언트에서 전달하지 않음 — Route Handler에서 `'guardian'` 고정 주입 (§3.4).

### 3.2 `src/features/auth-signup/model/useSignup.ts`

```typescript
// Design Ref: §3.2 — 회원가입 상태 관리 훅
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signupApi, type SignupRequest } from '../api/signup'

export function useSignup() {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signup = async (data: SignupRequest) => {
    setIsPending(true)
    setError(null)
    const result = await signupApi(data)
    setIsPending(false)

    if (!result.ok) {
      setError(result.error ?? '회원가입 실패')
      return
    }
    router.push('/login')
  }

  return { signup, isPending, error }
}
```

### 3.3 `src/features/auth-signup/ui/SignupForm.tsx`

```typescript
// Design Ref: §3.3 — 회원가입 폼 UI
// Plan SC: SC-02 — passwordConfirm 불일치 인라인 에러
'use client'
import { useState } from 'react'
import { useSignup } from '../model/useSignup'

export function SignupForm() {
  const { signup, isPending, error } = useSignup()
  const [confirmError, setConfirmError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    const passwordConfirm = (form.elements.namedItem('passwordConfirm') as HTMLInputElement).value

    // Plan SC: SC-02 — passwordConfirm 프론트 유효성
    if (password !== passwordConfirm) {
      setConfirmError('비밀번호가 일치하지 않습니다.')
      return
    }
    setConfirmError(null)
    signup({ name, email, password })
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* name, email, password, passwordConfirm 필드 */}
      {/* confirmError 인라인 표시 */}
      {/* error (서버 에러) 인라인 표시 */}
      {/* 로딩 중 버튼 disabled */}
    </form>
  )
}
```

> Tailwind 클래스는 Do 단계에서 LoginForm 스타일 참고하여 적용.

### 3.4 `app/api/auth/signup/route.ts`

```typescript
// Design Ref: §3.4 — FastAPI 프록시 + role 고정 주입
// Plan SC: SC-05 — role 서버 고정 주입
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()
  // body: { name, email, password } — role 클라이언트 미수신

  const res = await fetch(process.env.API_URL + '/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, role: 'guardian' }),  // role 서버 고정
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: '회원가입 실패' }))
    return NextResponse.json(error, { status: res.status })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
```

> **보안**: `role`은 `body`에서 받지 않고 서버에서 `'guardian'`으로 고정 주입.
> 클라이언트가 `role: 'admin'`으로 가입 시도해도 무시됨.

### 3.5 `app/signup/page.tsx`

```typescript
// Design Ref: §3.5 — Server Component shell
import type { Metadata } from 'next'
import { SignupForm } from '@features/auth-signup'

export const metadata: Metadata = { title: '회원가입 — 시니어 케어' }

export default function SignupPage() {
  return (
    <main>
      <h1>회원가입</h1>
      <SignupForm />
    </main>
  )
}
```

### 3.6 `app/signup/layout.tsx`

```typescript
// Design Ref: §3.6 — auth-login layout과 동일 구조
// app/login/layout.tsx 패턴 참고
```

> Do 단계에서 `app/login/layout.tsx`를 읽고 동일 구조로 작성.

### 3.7 `app/login/page.tsx` (수정)

```tsx
// 기존 LoginForm 하단에 Link 추가
// Plan SC: SC-06 — 로그인 페이지 회원가입 링크
import Link from 'next/link'

// ...
<p>계정이 없으신가요? <Link href="/signup">회원가입</Link></p>
```

> LoginForm.tsx 내부에 링크를 넣을지, page.tsx에서 넣을지는 Do 단계에서 확인 후 결정.
> FSD 원칙상 외부 route 링크는 page 레벨이 더 적합.

### 3.8 `src/features/auth-signup/index.ts`

```typescript
// Design Ref: §3.8 — FSD Public API
export { SignupForm } from './ui/SignupForm'
```

---

## 4. 데이터 흐름

```
Browser                    Next.js (Server)           FastAPI
   |                            |                        |
   | POST /api/auth/signup      |                        |
   | { name, email, password }  |                        |
   |--------------------------->|                        |
   |                            | POST /api/v1/auth/     |
   |                            |   signup               |
   |                            | { ..., role:'guardian'}|
   |                            |----------------------->|
   |                            |                        |
   |                            |       201 Created      |
   |                            |<-----------------------|
   |                            |                        |
   | { ok: true }, 201          |                        |
   |<---------------------------|                        |
   |                            |                        |
   | router.push('/login')      |                        |
   |--------------------------->|                        |
```

---

## 5. 에러 처리 설계

| 시나리오 | 처리 레이어 | 처리 방식 |
|----------|------------|----------|
| 비밀번호 확인 불일치 | 프론트엔드 (SignupForm) | submit 차단, `confirmError` 인라인 표시 |
| 이메일 이미 존재 (409/422) | 서버 에러 → `data.detail` | `error` state → 인라인 표시 |
| 네트워크 에러 | catch → fallback | '회원가입에 실패했습니다.' |
| FastAPI 500 | Route Handler fallback | `{ detail: '회원가입 실패' }` |

---

## 6. FSD 레이어 준수

```
app/ (pages)
  ↓
features/auth-signup  (SignupForm 임포트)
  ↓
shared/api (미사용 — fetch 직접 호출)
```

- `auth-signup`은 `auth-login`을 임포트하지 않음 (same-layer 금지)
- `AuthUser` 타입 불필요 — 회원가입은 cookie 설정 없음

---

## 7. 의존성

추가 패키지 없음 — Next.js 내장 기능만 사용:
- `next/navigation` → `useRouter()`
- `next/server` → `NextResponse`
- `next/link` → `<Link>`

---

## 8. 환경변수

| 변수 | 위치 | 설명 |
|------|------|------|
| `API_URL` | 서버 전용 | auth-login Route Handler와 동일 — 이미 설정됨 |

신규 환경변수 없음.

---

## 9. 구현 순서 (Module Map)

| 모듈 | 파일 | 설명 |
|------|------|------|
| **M1** Route Handler | `app/api/auth/signup/route.ts` | FastAPI 프록시 핵심, role 고정 주입 |
| **M2** Feature API+Model | `src/features/auth-signup/api/signup.ts`, `model/useSignup.ts`, `index.ts` | 비즈니스 로직 |
| **M3** Feature UI | `src/features/auth-signup/ui/SignupForm.tsx` | 4 필드 + passwordConfirm 검증 |
| **M4** Pages | `app/signup/page.tsx`, `app/signup/layout.tsx` | 라우트 연결 |
| **M5** Login Link | `app/login/page.tsx` | 회원가입 링크 추가 |

### 9.1 Session Guide

**전체 한 세션 권장** (파일 ~8개, ~150줄 예상)

```
Session 1 (전체):
  M1 → M2 → M3 → M4 → M5

또는 분할 시:
  Session 1: M1 + M2 (인프라)  /pdca do auth-signup --scope M1,M2
  Session 2: M3 + M4 + M5 (UI) /pdca do auth-signup --scope M3,M4,M5
```

---

## 10. Success Criteria 매핑

| SC | 기준 | 구현 위치 |
|----|------|----------|
| SC-01 | `/signup` 페이지 렌더링 | `app/signup/page.tsx` |
| SC-02 | 비밀번호 확인 불일치 → 인라인 에러, 제출 차단 | `SignupForm.tsx` — `confirmError` state |
| SC-03 | 정상 가입 → 201 → `/login` 리디렉션 | `useSignup.ts` — `router.push('/login')` |
| SC-04 | 이메일 중복 → 서버 에러 메시지 인라인 표시 | `useSignup.ts` → `error` state → `SignupForm.tsx` |
| SC-05 | `role: 'guardian'` 서버 고정 주입 | `route.ts` — `{ ...body, role: 'guardian' }` |
| SC-06 | 로그인 페이지 회원가입 링크 | `app/login/page.tsx` |
| SC-07 | `pnpm tsc --noEmit` 에러 없음 | TypeScript 검증 |
