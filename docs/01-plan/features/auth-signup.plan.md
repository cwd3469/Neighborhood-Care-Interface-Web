# [Plan] auth-signup

> guardian 자유 회원가입 — Next.js Route Handler 프록시 패턴

**작성일**: 2026-09-25
**상태**: Plan 완료
**전제**: auth-login 완료 (httpOnly cookie, proxy.ts, Route Handler 패턴)

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | guardian(보호자)이 서비스에 가입할 방법 없음 — 로그인 페이지에 진입점도 없는 상태 |
| **Solution** | `src/features/auth-signup/` 독립 feature + Route Handler FastAPI 프록시 — auth-login과 동일한 패턴 |
| **Function UX Effect** | 이메일·비밀번호·이름 입력 → 가입 성공 → `/login` 리디렉션, 로그인 페이지에 회원가입 링크 |
| **Core Value** | auth-login과 동일한 Route Handler 프록시 패턴 일관성 — FSD feature 분리, 동일 레이아웃 공유 |

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | guardian 자유 가입 경로 없음 → 서비스 진입 불가 |
| **WHO** | 프론트 5년차 — auth-login 패턴 이미 구현 완료 |
| **RISK** | 이메일 중복(409/422) 에러 처리, 비밀번호 확인 불일치 프론트 유효성 |
| **SUCCESS** | guardian이 가입 후 `/login`으로 이동, 로그인 → `/guardian` 접근 가능 |
| **SCOPE** | guardian 자유 가입만 — caregiver/admin 초대 가입, 이메일 인증, 로그아웃 별도 |

---

## 1. 배경

**auth-login 기존 패턴:**
```
[LoginForm] → POST /api/auth/login (Next.js RH) → FastAPI → httpOnly cookie
```

auth-signup도 동일 패턴:
```
[SignupForm] → POST /api/auth/signup (Next.js RH) → FastAPI POST /api/v1/auth/signup
             ← 201 Created
→ router.push('/login')
```

**역할 분리 정책:**
- guardian — 자유 가입 (`role: 'guardian'` 고정값으로 백엔드 전송)
- caregiver — 관리자 등록 (이번 범위 외)
- admin — 관리자 생성 (이번 범위 외)

---

## 2. 요구사항

### R-01: 회원가입 페이지 라우트

```
app/
  signup/
    page.tsx     Server Component shell (메타데이터 + SignupForm)
    layout.tsx   로그인과 동일한 인증 레이아웃 재사용 (또는 공유)
```

### R-02: SignupForm UI (`src/features/auth-signup/`)

FSD 구조:
```
src/features/auth-signup/
  ui/
    SignupForm.tsx    'use client' — email/password/passwordConfirm/name
  api/
    signup.ts        POST /api/auth/signup 호출
  model/
    useSignup.ts     회원가입 상태 관리 훅
  index.ts           public API
```

`SignupForm.tsx` 요구사항:
- 이름(name), 이메일(email), 비밀번호(password), 비밀번호 확인(passwordConfirm) 필드
- 비밀번호 확인 불일치 시 프론트엔드 유효성 검사 (submit 전 체크)
- 제출 시 로딩 상태 표시
- 에러 메시지 인라인 표시 (이메일 중복 등 서버 에러)
- 성공 시 `router.push('/login')`

### R-03: Next.js Route Handler (`app/api/auth/signup/route.ts`)

```typescript
// POST /api/auth/signup → FastAPI /api/v1/auth/signup 프록시
export async function POST(request: Request) {
  const body = await request.json()
  // body: { email, password, name, role: 'guardian' } — role 서버에서 고정 주입

  const res = await fetch(process.env.API_URL + '/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, role: 'guardian' }),  // role 고정
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: '회원가입 실패' }))
    return NextResponse.json(error, { status: res.status })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
```

> **보안**: `role`은 클라이언트에서 전달받지 않고 서버에서 `'guardian'`으로 고정 주입.
> 클라이언트가 다른 role로 가입 시도 불가.

### R-04: 로그인 페이지 회원가입 링크

`app/login/page.tsx` 또는 `LoginForm.tsx` 하단에 링크 추가:
```
계정이 없으신가요? <Link href="/signup">회원가입</Link>
```

### R-05: 레이아웃

`app/signup/layout.tsx` — `app/login/layout.tsx`와 동일한 구조 (헤더 없는 인증 전용 레이아웃).

---

## 3. 필드 정의

| 필드 | 타입 | 유효성 | 비고 |
|------|------|--------|------|
| name | string | required | 이름 |
| email | string | required, email format | 이메일 |
| password | string | required, minLength 8 | 비밀번호 |
| passwordConfirm | string | required, === password | 비밀번호 확인 |

> `role`은 폼에 없음 — Route Handler에서 `'guardian'` 고정 주입.

---

## 4. 에러 처리

| 시나리오 | 처리 방식 |
|----------|-----------|
| 비밀번호 확인 불일치 | 프론트엔드 유효성 — submit 차단, 인라인 에러 |
| 이메일 이미 존재 (409/422) | 서버 에러 → `data.detail` 인라인 표시 |
| 네트워크 에러 | 일반 에러 메시지 표시 |
| FastAPI 500 | '회원가입 중 오류가 발생했습니다.' 폴백 |

---

## 5. 파일 계획

```
신규 6개:
  app/signup/page.tsx
  app/signup/layout.tsx
  app/api/auth/signup/route.ts
  src/features/auth-signup/api/signup.ts
  src/features/auth-signup/model/useSignup.ts
  src/features/auth-signup/ui/SignupForm.tsx
  src/features/auth-signup/index.ts        ← 7개 (index 포함)

수정 1개:
  app/login/page.tsx    (또는 LoginForm.tsx) — 회원가입 링크 추가
```

---

## 6. Success Criteria

| # | 기준 | 검증 방법 |
|---|------|----------|
| SC-01 | `/signup` 페이지 렌더링 | 브라우저 접속 |
| SC-02 | 비밀번호 확인 불일치 → 인라인 에러, 제출 차단 | 다른 값 입력 |
| SC-03 | 정상 가입 → FastAPI 201 → `/login` 리디렉션 | 새 계정 가입 |
| SC-04 | 이메일 중복 → 서버 에러 메시지 인라인 표시 | 동일 이메일 재가입 |
| SC-05 | `role: 'guardian'` 서버에서 고정 주입 — 클라이언트 미노출 | Route Handler 코드 확인 |
| SC-06 | 로그인 페이지에 회원가입 링크 표시 | 브라우저 확인 |
| SC-07 | `pnpm tsc --noEmit` 에러 없음 | TypeScript 검증 |

---

## 7. 리스크

| 리스크 | 심각도 | 대응 |
|--------|--------|------|
| FastAPI `/api/v1/auth/signup` 미구현 | 중 | Route Handler는 완성, FastAPI 구현 후 연동 |
| 이메일 중복 응답 형태 (409 vs 422) | 저 | `data.detail` 폴백으로 범용 처리 |
| signup 레이아웃 로그인과 다를 경우 | 저 | 별도 layout.tsx — 독립 관리 가능 |

---

## 8. 범위 밖 (Out of Scope)

- 이메일 인증 (verification link) — 별도 feature
- caregiver/admin 초대 가입 — 별도 feature
- 비밀번호 강도 표시 — 추후 UX 개선
- 소셜 로그인 — Milestone 이후

---

## 9. 다음 단계

- `/pdca design auth-signup`
