# [Analysis] auth-login

**분석일**: 2026-09-23
**Match Rate**: 100%
**상태**: Check 완료

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 3개 대시보드 인증 게이트 없음 → Milestone 4 착수 전 선행 필요 |
| **WHO** | 프론트 5년차 — App Router Server/Client 패턴 이미 숙지 |
| **RISK** | 로컬 CORS / `sameSite` cookie 설정 / role cookie 위조 시 라우팅 오동작 |
| **SUCCESS** | 로그인 → httpOnly cookie → `/dashboard` → role 리디렉션 → RSC 토큰 읽기 |
| **SCOPE** | 로그인만 — 회원가입/로그아웃/refresh 별도 |

---

## Success Criteria 평가

| # | 기준 | 상태 | 증거 |
|---|------|------|------|
| SC-01 | `/login` 페이지 렌더링 | ✅ Met | `app/login/page.tsx:9` |
| SC-02 | 잘못된 자격증명 → 에러 인라인 표시 | ✅ Met | `LoginForm.tsx:44` `role="alert"` |
| SC-03 | 로그인 성공 → httpOnly cookie 설정 | ✅ Met | `app/api/auth/login/route.ts:36-37` |
| SC-04 | `/dashboard` → role 경로 리디렉션 | ✅ Met | `proxy.ts:32-35` |
| SC-05 | 미인증 보호 경로 → `/login` | ✅ Met | `proxy.ts:27-29` |
| SC-06 | `getServerApiHeaders()` async 동작 | ✅ Met | `src/shared/api/server.ts:18` |
| SC-07 | `API_URL` 서버 전용 환경변수 | ✅ Met | `route.ts:14` (NEXT_PUBLIC 없음) |

**Overall: 7/7 (100%)**

---

## Design Spec 대조

| 항목 | 상태 |
|------|------|
| FSD 구조 (auth-login/ui/api/model/index) | ✅ |
| Route Handler FastAPI 프록시 + httpOnly COOKIE_OPTIONS | ✅ |
| `proxy.ts` + `export function proxy` (Next.js 16 컨벤션) | ✅ |
| `await cookies()` async 패턴 | ✅ |
| `loginApi` → Next.js Route Handler 호출 (FastAPI 직접 아님) | ✅ |
| `useLogin` 'use client' + useState + useRouter | ✅ |
| Shell pages + dashboard fallback `redirect('/login')` | ✅ |

---

## Gap 목록

| # | 심각도 | 항목 | 처리 |
|---|--------|------|------|
| G-01 | Minor | `server.ts` JSDoc 예시에서 `await` 누락 | ✅ 자동 수정 |

**iterate 불필요** — 100% 달성.

---

## Next.js 16 대응 사항 (추가 기록)

| 변경 사항 | 대응 방법 |
|-----------|----------|
| `middleware.ts` deprecated | `proxy.ts` + `export function proxy`로 변경 |
| `cookies()` async | `await cookies()` + `getServerApiHeaders` async 함수로 변경 |
