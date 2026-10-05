# [Design] app-header

**작성일**: 2026-09-28
**상태**: Design 완료
**선택 아키텍처**: Option C — user_name 쿠키 + role별 layout.tsx

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 인증 후 페이지에 사용자 이름·네비게이션 없어 UX 불완전 |
| **WHO** | 로그인한 guardian/caregiver/admin 모든 사용자 |
| **RISK** | AuthUser에 name 없음 → 쿠키 확장 / logout 후 캐시 잔존 / 모바일 사이드바 상태 |
| **SUCCESS** | 헤더에 이름 표시, 로그아웃 동작, 역할별 메뉴 링크 정상 |
| **SCOPE** | AppShell 위젯 신규 + logout Route Handler + AuthUser name 확장 + role layout.tsx 3개 |

---

## 1. Overview

**선택: Option C — user_name 쿠키 + role별 layout.tsx**

```
[login Route Handler]
  FastAPI 응답에서 name → user_name 쿠키 저장 (httpOnly)

[/api/auth/me]
  user_role + user_name 쿠키 읽어 AuthUser { role, name } 반환

[AuthProvider]
  /api/auth/me → AuthUser { role, name } 세팅 (기존 로직 그대로)

[app/guardian/layout.tsx]
[app/caregiver/layout.tsx]    ← role별 layout에 AppShell 적용
[app/admin/layout.tsx]

[AppShell]
  AppSidebar (역할별 NAV_ITEMS)
  AppHeader (user.name, 로그아웃, 햄버거)
  {children}
```

---

## 2. 파일별 설계

### 2.1 `app/api/auth/login/route.ts` — 수정

FastApiTokenResponse에 `name` 추가, `user_name` 쿠키 저장:

```typescript
// Design Ref: §2.1 — FastAPI 응답에서 name → user_name 쿠키
interface FastApiTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  role: string;
  name: string;  // ← 추가
}

// 쿠키 설정 부분에 추가:
response.cookies.set("user_name", responseData.name, {
  ...BASE_COOKIE_OPTIONS,
  maxAge: REFRESH_TOKEN_MAX_AGE,
})
```

### 2.2 `app/api/auth/me/route.ts` — 수정

`user_name` 쿠키 읽어 name 포함 반환:

```typescript
// Design Ref: §2.2 — user_name 쿠키 → AuthUser.name
export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get("access_token")?.value
  const role  = cookieStore.get("user_role")?.value
  const name  = cookieStore.get("user_name")?.value

  if (!token || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json({ role, name: name ?? "사용자" })
}
```

### 2.3 `src/features/auth-login/model/AuthContext.tsx` — 수정

```typescript
// Design Ref: §2.3 — AuthUser에 name 필드 추가
export interface AuthUser {
  role: ROLE;
  name: string;  // ← 추가
}
```

### 2.4 `app/api/auth/logout/route.ts` — 신규

```typescript
// Design Ref: §2.4 — 로그아웃: 쿠키 삭제
import { NextResponse } from "next/server"

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete("access_token")
  response.cookies.delete("refresh_token")
  response.cookies.delete("user_role")
  response.cookies.delete("user_name")
  return response
}
```

### 2.5 `src/widgets/app-shell/nav-config.ts` — 신규

```typescript
// Design Ref: §2.5 — ROLE별 NavItem 배열
import type { ROLE } from "@features/auth-login"

export interface NavItem {
  label: string
  href: string
}

export const NAV_ITEMS: Record<ROLE, NavItem[]> = {
  guardian: [
    { label: "대시보드",      href: "/guardian" },
    { label: "건강기록 조회", href: "/guardian/records" },
    { label: "방문일정",      href: "/guardian/schedules" },
    { label: "케어기버 목록", href: "/guardian/caregivers" },
  ],
  caregiver: [
    { label: "대시보드",         href: "/caregiver" },
    { label: "오늘 방문 일정",   href: "/caregiver/schedules" },
    { label: "건강기록 입력",    href: "/caregiver/records" },
    { label: "담당 어르신 목록", href: "/caregiver/seniors" },
  ],
  admin: [
    { label: "대시보드",    href: "/admin" },
    { label: "회원 관리",   href: "/admin/users" },
    { label: "일정 관리",   href: "/admin/schedules" },
    { label: "어르신 관리", href: "/admin/seniors" },
  ],
}
```

### 2.6 `src/widgets/app-shell/ui/AppSidebar.tsx` — 신규

```typescript
// Design Ref: §2.6 — 역할별 사이드바 + 반응형
"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@features/auth-login"
import { NAV_ITEMS } from "../nav-config"

interface Props {
  open: boolean
  onClose: () => void
}

export function AppSidebar({ open, onClose }: Props) {
  const { user } = useAuth()
  const pathname = usePathname()
  const items = user ? NAV_ITEMS[user.role] : []

  return (
    <>
      {/* 모바일 오버레이 */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* 사이드바 본체 */}
      <aside
        className={[
          // 데스크탑: 항상 표시
          "hidden md:flex md:w-64 md:flex-col",
          // 모바일: open 시 표시
          open ? "fixed inset-y-0 left-0 z-50 flex w-64 flex-col" : "",
          "border-r bg-white",
        ].join(" ")}
      >
        <div className="flex h-16 items-center border-b px-4 font-semibold">
          시니어 케어
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={[
                "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100",
              ].join(" ")}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  )
}
```

### 2.7 `src/widgets/app-shell/ui/AppHeader.tsx` — 신규

```typescript
// Design Ref: §2.7 — 상단 헤더 (이름 / 로그아웃 / 햄버거)
"use client"
import { useRouter } from "next/navigation"
import { useAuth } from "@features/auth-login"
import { api } from "@shared/api"

interface Props {
  onToggleSidebar: () => void
}

export function AppHeader({ onToggleSidebar }: Props) {
  const { user } = useAuth()
  const router = useRouter()

  async function handleLogout() {
    await api.post("/api/auth/logout")
    router.push("/login")
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-4">
      {/* 햄버거 (모바일) */}
      <button
        className="rounded-md p-2 hover:bg-gray-100 md:hidden"
        onClick={onToggleSidebar}
        aria-label="메뉴 열기"
      >
        {/* 햄버거 아이콘 */}
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* 우측: 사용자명 + 로그아웃 */}
      <div className="ml-auto flex items-center gap-4">
        <span className="text-sm text-gray-700">{user?.name}</span>
        <button
          onClick={handleLogout}
          className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
        >
          로그아웃
        </button>
      </div>
    </header>
  )
}
```

### 2.8 `src/widgets/app-shell/ui/AppShell.tsx` — 신규

```typescript
// Design Ref: §2.8 — Sidebar + Header + main 레이아웃 조합
"use client"
import { useState } from "react"
import { AppSidebar } from "./AppSidebar"
import { AppHeader } from "./AppHeader"

interface Props {
  children: React.ReactNode
}

export function AppShell({ children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50">
      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

### 2.9 `src/widgets/app-shell/index.ts` — 신규

```typescript
// Design Ref: §2.9 — widget public API
export { AppShell } from "./ui/AppShell"
```

### 2.10 role별 `layout.tsx` 3개 — 신규

```typescript
// app/guardian/layout.tsx
// Design Ref: §2.10 — AppShell을 guardian 라우트에 적용
import { AppShell } from "@widgets/app-shell"

interface Props { children: React.ReactNode }

export default function GuardianLayout({ children }: Props) {
  return <AppShell>{children}</AppShell>
}
```

(caregiver, admin 동일 패턴)

---

## 3. 엣지 케이스

| 케이스 | 처리 방법 |
|--------|----------|
| FastAPI 응답에 name 없음 | `name ?? "사용자"` fallback in /api/auth/me |
| 로그아웃 후 react-query 캐시 잔존 | AppHeader에서 `queryClient.clear()` 호출 |
| 사이드바 열린 상태에서 라우트 이동 | Link onClick에서 onClose() 호출 |
| AuthUser isLoading=true 시 이름 미표시 | `user?.name` optional chaining으로 처리 |

---

## 4. 보안

- `user_name` 쿠키: httpOnly + sameSite: lax — JS 접근 불가
- logout은 server-side 쿠키 삭제 — 클라이언트에서 토큰 조작 불가
- AppShell은 AuthProvider 하위 — 미인증 시 proxy.ts가 이미 /login으로 리다이렉트

---

## 5. FSD 레이어 준수

```
app/(layout)      → AppShell import
  ↓
widgets/app-shell → AppHeader, AppSidebar 조합
  ↓
features/auth-login → useAuth(), AuthUser type
  ↓
shared/api        → api.post('/api/auth/logout')
```

같은 레이어 간 import 없음 ✅

---

## 11. Implementation Guide

### 11.1 구현 순서

```
M1: 데이터 레이어
  1. app/api/auth/login/route.ts — name 쿠키 추가
  2. app/api/auth/me/route.ts — name 반환
  3. src/features/auth-login/model/AuthContext.tsx — AuthUser.name 추가
  4. app/api/auth/logout/route.ts — 신규

M2: 위젯 기반
  5. src/widgets/app-shell/nav-config.ts — 신규
  6. src/widgets/app-shell/ui/AppSidebar.tsx — 신규

M3: 위젯 조합
  7. src/widgets/app-shell/ui/AppHeader.tsx — 신규
  8. src/widgets/app-shell/ui/AppShell.tsx — 신규
  9. src/widgets/app-shell/index.ts — 신규

M4: 레이아웃 적용
  10. app/guardian/layout.tsx — 신규
  11. app/caregiver/layout.tsx — 신규
  12. app/admin/layout.tsx — 신규
```

### 11.2 주의사항

- AppSidebar/AppHeader는 `"use client"` 필수 (useAuth, useRouter 사용)
- AppShell도 `"use client"` 필수 (useState 사용)
- role별 layout.tsx는 Server Component로 유지 가능 (`"use client"` 불필요)
- `@widgets/app-shell` alias: `tsconfig.json`의 `@widgets/*` → `src/widgets/*` 확인

### 11.3 Session Guide

| 모듈 | 파일 | 작업 |
|------|------|------|
| M1 | login route, me route, AuthContext, logout route | 데이터 레이어 (~20줄 수정/신규) |
| M2 | nav-config.ts, AppSidebar.tsx | 사이드바 (~60줄) |
| M3 | AppHeader.tsx, AppShell.tsx, index.ts | 헤더 + 조합 (~60줄) |
| M4 | guardian/layout, caregiver/layout, admin/layout | 레이아웃 적용 (~15줄) |

**Single Session 권장** — 전체 ~155줄, 1 세션 충분
