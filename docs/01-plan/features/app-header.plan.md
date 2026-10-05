# [Plan] app-header

> 인증된 페이지 공통 헤더 + 역할별 사이드바 네비게이션

**작성일**: 2026-09-28
**상태**: Plan 완료

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 인증된 페이지에 사용자 식별 정보·네비게이션이 없어 UX가 불완전하고 역할별 이동 경로가 없음 |
| **Solution** | AppShell 위젯(헤더 + 사이드바)으로 사용자 이름·로그아웃·역할별 메뉴 제공. PC 항상 표시, 모바일 햄버거 토글 |
| **Function UX Effect** | 로그인 후 즉시 자신의 이름과 역할에 맞는 메뉴를 볼 수 있어 앱 완성도가 크게 향상됨 |
| **Core Value** | guardian/caregiver/admin 3개 역할이 각자 최적화된 네비게이션 경험, 단일 AppShell 위젯으로 중복 없이 처리 |

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 인증 후 사용자가 어디로 가야 하는지 알 수 없음 — 역할별 메뉴와 사용자 식별 필요 |
| **WHO** | 로그인한 guardian/caregiver/admin 모든 사용자 |
| **RISK** | AuthUser에 name 없음 → 타입 확장 필요 / 로그아웃 Route Handler 신규 / 모바일 사이드바 상태 관리 |
| **SUCCESS** | 헤더에 이름 표시, 로그아웃 동작, 역할별 메뉴 링크 정상 작동 |
| **SCOPE** | AppShell 위젯 신규 + logout Route Handler + AuthUser name 확장 + 각 role layout.tsx 추가 |

---

## 1. 배경

현재 인증 후 페이지(`/guardian`, `/caregiver`, `/admin`)에는 레이아웃 껍데기만 있고:
- 사용자 이름 미표시
- 로그아웃 수단 없음
- 역할별 메뉴 없음

AuthUser 타입에도 `name` 필드가 없어 이름을 표시할 방법이 없음.

---

## 2. 아키텍처

```
app/guardian/layout.tsx
app/caregiver/layout.tsx     ← 각 role에 layout.tsx 추가
app/admin/layout.tsx

                ↓ AppShell import

src/widgets/app-shell/
  AppShell.tsx       ← 전체 레이아웃 (Sidebar + children)
  AppHeader.tsx      ← 상단 바 (사용자 이름 / 로그아웃 / 햄버거)
  AppSidebar.tsx     ← 사이드바 (역할별 메뉴)
  nav-config.ts      ← ROLE별 메뉴 항목 배열

app/api/auth/logout/route.ts  ← httpOnly 쿠키 삭제 → 200

src/features/auth-login/model/AuthContext.tsx
  AuthUser: { role: ROLE, name: string }  ← name 추가
```

**사이드바 토글 상태**: React useState — 모바일에서만 필요, 서버 상태 불필요

---

## 3. 요구사항

### R-01: `AuthUser` 타입 확장

```typescript
export interface AuthUser {
  role: ROLE;
  name: string;   // ← 추가
}
```

- `AuthProvider`에서 `/api/auth/me` 등 사용자 정보 API로 name 로딩 (또는 로그인 응답에 name 포함 시 활용)

### R-02: `app/api/auth/logout/route.ts` — 신규

```typescript
export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete('access_token')
  response.cookies.delete('refresh_token')
  response.cookies.delete('user_role')
  return response
}
```

### R-03: `src/widgets/app-shell/nav-config.ts`

```typescript
export const NAV_ITEMS: Record<ROLE, NavItem[]> = {
  guardian: [
    { label: '대시보드',      href: '/guardian' },
    { label: '건강기록 조회', href: '/guardian/records' },
    { label: '방문일정',      href: '/guardian/schedules' },
    { label: '케어기버 목록', href: '/guardian/caregivers' },
  ],
  caregiver: [
    { label: '대시보드',         href: '/caregiver' },
    { label: '오늘 방문 일정',   href: '/caregiver/schedules' },
    { label: '건강기록 입력',    href: '/caregiver/records' },
    { label: '담당 어르신 목록', href: '/caregiver/seniors' },
  ],
  admin: [
    { label: '대시보드',   href: '/admin' },
    { label: '회원 관리',  href: '/admin/users' },
    { label: '일정 관리',  href: '/admin/schedules' },
    { label: '어르신 관리', href: '/admin/seniors' },
  ],
}
```

### R-04: `AppHeader.tsx`

- `useAuth()` → `user.name` 표시
- 로그아웃 버튼: `api.post('/api/auth/logout')` → `router.push('/login')`
- 햄버거 버튼: `sidebarOpen` 토글 (모바일)

### R-05: `AppSidebar.tsx`

- `useAuth()` → `user.role` → `NAV_ITEMS[role]` 렌더링
- `usePathname()` → 현재 경로 활성화 표시
- PC: `hidden md:flex` 항상 표시 / 모바일: `sidebarOpen` 조건부 표시

### R-06: `AppShell.tsx`

- `sidebarOpen` useState 관리
- `<AppHeader onHamburger={toggle} />` + `<AppSidebar open={sidebarOpen} />` + `{children}`

### R-07: `app/{role}/layout.tsx` 3개 추가

```tsx
// app/guardian/layout.tsx
import { AppShell } from '@widgets/app-shell'
export default function GuardianLayout({ children }) {
  return <AppShell>{children}</AppShell>
}
```

---

## 4. 파일 계획

```
신규:
  src/widgets/app-shell/index.ts
  src/widgets/app-shell/ui/AppShell.tsx
  src/widgets/app-shell/ui/AppHeader.tsx
  src/widgets/app-shell/ui/AppSidebar.tsx
  src/widgets/app-shell/nav-config.ts
  app/api/auth/logout/route.ts
  app/guardian/layout.tsx
  app/caregiver/layout.tsx
  app/admin/layout.tsx

수정:
  src/features/auth-login/model/AuthContext.tsx   (AuthUser에 name 추가)
  src/features/auth-login/index.ts               (AuthUser 재export — 변경 없을 수 있음)
```

---

## 5. 성공 기준

| # | 기준 | 검증 방법 |
|---|------|----------|
| SC-01 | 헤더에 로그인 사용자 이름 표시 | guardian 로그인 후 이름 확인 |
| SC-02 | 로그아웃 버튼 → 쿠키 삭제 → /login 이동 | 버튼 클릭 후 Network 탭 확인 |
| SC-03 | 역할별 메뉴 항목 정확히 표시 | guardian/caregiver/admin 각각 확인 |
| SC-04 | 현재 경로 메뉴 항목 활성화 표시 | active 스타일 확인 |
| SC-05 | PC에서 사이드바 항상 표시 | 960px+ 화면에서 확인 |
| SC-06 | 모바일 햄버거 → 사이드바 토글 | 모바일 너비에서 확인 |
| SC-07 | `pnpm tsc --noEmit` 에러 없음 | TypeScript 검증 |

---

## 6. 리스크

| 리스크 | 심각도 | 대응 |
|--------|--------|------|
| AuthUser에 name 추가 시 AuthProvider 수정 필요 | 중 | AuthProvider에서 `/api/auth/me` 또는 로그인 응답으로 name 세팅 |
| logout 후 react-query 캐시 잔존 | 저 | `queryClient.clear()` 호출 |
| 사이드바 오버레이 (모바일) 접근성 | 저 | 오버레이 클릭 시 닫기 처리 |

---

## 7. 범위 밖

- 알림(notification) 기능
- 사용자 프로필 편집
- 다크모드 토글
- 사이드바 접기/펼치기 (fold) — 모바일 토글로 충분

---

## 8. 다음 단계

- `/pdca design app-header`
