# [Analysis] auth-refresh-token

**작성일**: 2026-09-25
**Match Rate**: 97%
**결정**: 그대로 진행

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | access_token(1h) 만료 시 로그인 상태가 끊기는 문제 → refresh_token(7d)으로 silent 갱신 |
| **WHO** | 모든 역할(guardian/caregiver/admin) — 보호 라우트 접근 사용자 전체 |
| **RISK** | proxy.ts Edge Runtime에서 내부 Route Handler 호출 / set-cookie 헤더 전파 |
| **SUCCESS** | access_token 만료 후 새로고침 시 /login 이동 없이 정상 동작 |
| **SCOPE** | proxy.ts 수정 + /api/auth/refresh 신규 + login maxAge 분리 |

---

## Success Criteria 최종 평가

| # | 기준 | 상태 | 근거 |
|---|------|------|------|
| SC-01 | access_token 만료 + refresh 있음 → 성공 | ✅ Met | proxy.ts:23-54 |
| SC-02 | 둘 다 없음 → /login | ✅ Met | proxy.ts:25-27 |
| SC-03 | refresh_token maxAge=7일 | ✅ Met | login/route.ts:42 |
| SC-04 | FastAPI 미구현 시 /login | ✅ Met | refresh/route.ts:27-29 |
| SC-05 | pnpm tsc --noEmit 에러 없음 | ✅ Met | 검증 완료 |

**Success Rate: 5/5 (100%)**

---

## Gap 목록

| # | 심각도 | 항목 | 위치 | 결정 |
|---|--------|------|------|------|
| G-01 | Low | `sameSite: "lax"` — `as const` 없음 (tsc 통과) | refresh/route.ts:37 | 허용 |
| G-02 | Low | 상단 주석 §3.4(기존)와 §3.1(신규) 공존 | login/route.ts:1-2 | 허용 |

---

## Decision Record 검증

| 결정 | 구현 여부 | 결과 |
|------|----------|------|
| Option C: proxy.ts → Route Handler → FastAPI | ✅ 구현됨 | proxy.ts:30-36 |
| maxAge 분리: access 1h, refresh 7d | ✅ 구현됨 | login/route.ts:41-42 |
| set-cookie 헤더 전파 | ✅ 구현됨 | proxy.ts:49-52 |
| FastAPI 미구현 graceful 처리 | ✅ 구현됨 | refresh/route.ts:27-29 |
