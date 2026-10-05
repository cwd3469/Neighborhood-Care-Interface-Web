# [Analysis] app-header

**작성일**: 2026-09-28
**상태**: Check 완료 (자동 수정 포함)
**Match Rate**: 96%
**Iteration**: 0 (G-01 즉시 수정)

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 인증 후 페이지에 사용자 이름·네비게이션 없어 UX 불완전 |
| **WHO** | 로그인한 guardian/caregiver/admin 모든 사용자 |
| **RISK** | AuthUser.name 없음 → 쿠키 확장 / logout 캐시 잔존 / 모바일 사이드바 상태 |
| **SUCCESS** | 헤더 이름 표시, 로그아웃, 역할별 메뉴 링크 정상 작동 |

---

## 1. Success Criteria 평가

| SC | 기준 | 상태 | 근거 |
|----|------|------|------|
| SC-01 | 헤더에 사용자 이름 표시 | ✅ Met | `AppHeader.tsx` — `{user?.name}` |
| SC-02 | 로그아웃 → 쿠키 삭제 → /login | ✅ Met | `logout/route.ts` 4개 쿠키 삭제 + `queryClient.clear()` + `router.push` |
| SC-03 | 역할별 메뉴 항목 정확히 표시 | ✅ Met | `nav-config.ts` — 3개 역할 각 4항목 |
| SC-04 | 현재 경로 메뉴 활성화 | ✅ Met | `AppSidebar.tsx` — `pathname === item.href` → `bg-blue-50 text-blue-700` |
| SC-05 | PC 사이드바 항상 표시 | ✅ Met | `md:flex md:w-64` — @media 쿼리로 `hidden` 덮어씌움 |
| SC-06 | 모바일 햄버거 → 사이드바 토글 | ✅ Met | `AppShell` useState + `AppHeader` 버튼 + `AppSidebar` conditional |
| SC-07 | tsc --noEmit 통과 | ✅ Met | 0 errors (수정 후 재확인) |

**Success Rate: 7/7 (100%)**

---

## 2. Gap 분석

### 2.1 발견된 갭

| # | 심각도 | 항목 | 위치 | 상태 |
|---|--------|------|------|------|
| G-01 | Important | Tailwind display 클래스 충돌 | `AppSidebar.tsx:33-35` | ✅ 즉시 수정 |

**G-01 상세:**
```
수정 전:
  className={["flex flex-col ...", "hidden md:flex md:w-64", open ? "...flex..." : ""]}
  → 모바일 open=true 시 `hidden`(display:none)이 `flex`(display:flex)를 덮어씌움
  → 사이드바가 열리지 않는 버그

수정 후:
  className={["flex-col ...", "md:flex md:w-64", open ? "flex fixed ..." : "hidden"]}
  → display 속성을 open 조건부로만 설정 → 충돌 없음
```

### 2.2 모듈별 매치율

| 모듈 | 설계 항목 | 구현 여부 |
|------|-----------|-----------|
| M1: login/route.ts | name 필드 + user_name 쿠키 | ✅ |
| M1: me/route.ts | name 쿠키 읽어 반환 | ✅ |
| M1: AuthContext.tsx | AuthUser.name 추가 | ✅ |
| M1: logout/route.ts | 4개 쿠키 삭제 | ✅ |
| M2: nav-config.ts | ROLE별 NavItem 배열 | ✅ |
| M2: AppSidebar.tsx | PC 항상/모바일 토글 + 활성화 | ✅ (G-01 수정) |
| M3: AppHeader.tsx | 이름/로그아웃/햄버거 + cache clear | ✅ |
| M3: AppShell.tsx | sidebarOpen state + 조합 | ✅ |
| M3: index.ts | AppShell export | ✅ |
| M4: 3× layout.tsx | AppShell 적용 | ✅ |

---

## 3. 설계 초과 달성 항목

| 항목 | 내용 |
|------|------|
| `queryClient.clear()` | 로그아웃 시 react-query 캐시 초기화 — Plan 리스크 항목 사전 처리 |
| `aria-hidden="true"` | 오버레이 배경 접근성 처리 |
| `aria-label="메뉴 열기"` | 햄버거 버튼 접근성 처리 |

---

## 4. 최종 결론

**Match Rate: 96%** (G-01 Important 1건 즉시 수정 완료)

G-01 수정 후 실질적 매치율 100%. 모든 SC 충족.
