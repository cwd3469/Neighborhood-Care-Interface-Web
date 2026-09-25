# [Report] auth-login

> JWT 로그인 — httpOnly cookie + Next.js 16 proxy 패턴 완료 보고서

**완료일**: 2026-09-23
**Match Rate**: 100%
**Iteration**: 0회

---

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | auth-login |
| **완료일** | 2026-09-23 |
| **Match Rate** | 100% |
| **생성 파일** | 11개 신규 + 1개 수정 |

### Value Delivered (4 Perspectives)

| 관점 | 결과 |
|------|------|
| **Problem** | 3개 대시보드 인증 게이트 없음 → 완전한 route protection 구현 |
| **Solution** | Next.js Route Handler 프록시 → FastAPI → httpOnly cookie → `proxy.ts` 보호 라우트 |
| **Function UX Effect** | `/login` → role별 자동 리디렉션, 미인증 접근 즉시 차단, Server Component에서 `await getServerApiHeaders()` 한 줄로 인증 헤더 |
| **Core Value** | "왜 httpOnly cookie인가", "Next.js Route Handler 프록시 패턴", "`middleware` → `proxy` Next.js 16 변경" — 면접 어필 포인트 |

---

## Key Decisions & Outcomes

| 결정 | 결과 |
|------|------|
| httpOnly cookie | JS에서 토큰 접근 불가 → XSS 안전 |
| Route Handler 프록시 | 브라우저-FastAPI 직접 통신 없음, `API_URL` 서버 전용 유지 |
| `proxy.ts` (Next.js 16) | `middleware.ts` deprecated → 빌드 경고 없음 |
| `await cookies()` | Next.js 16 async cookies API 대응 |
| `API_URL` vs `NEXT_PUBLIC_API_URL` 분리 | 서버 시크릿 브라우저 미노출 |

---

## 성공 기준 최종 상태

**7/7 (100%)** — 모든 Plan 요구사항 충족

---

## 생성된 산출물

```
proxy.ts                              보호 라우트 + role 리디렉션
app/api/auth/login/route.ts           FastAPI 프록시 + httpOnly cookie
app/login/page.tsx + layout.tsx       로그인 페이지
app/dashboard/page.tsx                role 리디렉션 진입점
app/guardian|caregiver|admin/page.tsx Shell 페이지 3종
src/features/auth-login/
  api/login.ts                        Route Handler 호출
  model/useLogin.ts                   로그인 상태 훅
  ui/LoginForm.tsx                    로그인 폼 UI
  index.ts                            FSD public API
src/shared/api/server.ts              RSC 인증 헤더 유틸
.env.local.example                    API_URL 추가
```

---

## 다음 단계

- **Milestone 4**: 보호자 / 요양사 / 관리자 대시보드 3종 구현
- 각 대시보드: `getServerApiHeaders()` + `SERVER_API_URL` 사용해 FastAPI 데이터 로드
- 로그아웃: cookie 삭제 Route Handler (`app/api/auth/logout/route.ts`) — 별도 feature
