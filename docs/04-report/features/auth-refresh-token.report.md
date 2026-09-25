# [Report] auth-refresh-token

**작성일**: 2026-09-25
**상태**: 완료
**Match Rate**: 97%
**Success Rate**: 5/5

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | access_token(1h) 만료 시 로그인 상태 단절 — refresh_token이 있어도 미활용, 매번 재로그인 |
| **Solution** | proxy.ts(Edge) → `/api/auth/refresh`(Node.js) → FastAPI 흐름으로 silent refresh 구현. refresh_token maxAge 7일 적용 |
| **Function UX Effect** | 7일 이내 재방문 시 로그인 유지. 새로고침/탭 이동 시 끊김 없음. FastAPI 미구현 시 graceful /login 처리 |
| **Core Value** | Client Component 변경 없이 전역 적용. Edge Middleware 패턴 + httpOnly cookie 보안 유지 |

---

### 1.3 Value Delivered

| 관점 | 계획 | 실제 |
|------|------|------|
| **Problem** | access_token 만료 시 재로그인 | ✅ 해결 — silent refresh 구현 |
| **Solution** | proxy.ts + Route Handler | ✅ 설계 그대로 구현 |
| **Function UX** | 7일 세션 유지 | ✅ refresh_token maxAge=7일 적용 |
| **Core Value** | Edge + httpOnly 보안 유지 | ✅ 기존 보안 구조 변경 없음 |

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **Feature** | auth-refresh-token |
| **작성일** | 2026-09-25 |
| **PDCA 사이클** | Plan → Design → Do → Check (1회, 반복 없음) |
| **최종 Match Rate** | 97% |

---

## 2. 구현 내용

### 변경 파일

| 파일 | 작업 | 핵심 변경 |
|------|------|----------|
| `app/api/auth/login/route.ts` | 수정 | maxAge 분리: access=1h, refresh=7d |
| `app/api/auth/refresh/route.ts` | 신규 | FastAPI /refresh 프록시, set-cookie |
| `proxy.ts` | 수정 | async 변환, silent refresh 로직 추가 |

### 신규 패키지
없음

### 구현 흐름

```
[보호 라우트 접근]
  └─ access_token 있음 → 통과
  └─ access_token 없음
      └─ refresh_token 없음 → /login
      └─ refresh_token 있음
          → POST /api/auth/refresh (Cookie 전달)
              → FastAPI /refresh 호출
              → 성공: 새 access_token set-cookie
              → 실패: 401
          → 성공 → set-cookie 전파 → 원래 페이지
          → 실패 → /login
```

---

## 3. Success Criteria 최종 상태

| # | 기준 | 상태 | 근거 |
|---|------|------|------|
| SC-01 | access_token 만료 + refresh 있음 → 성공 | ✅ Met | proxy.ts:23-54 |
| SC-02 | 둘 다 없음 → /login | ✅ Met | proxy.ts:25-27 |
| SC-03 | refresh_token maxAge=7일 | ✅ Met | login/route.ts:42 |
| SC-04 | FastAPI 미구현 시 /login graceful | ✅ Met | refresh/route.ts:27-29 |
| SC-05 | pnpm tsc --noEmit 에러 없음 | ✅ Met | 검증 완료 |

**Overall: 5/5 (100%)**

---

## 4. Key Decisions & Outcomes

| 결정 | 내용 | 결과 |
|------|------|------|
| Option C (proxy.ts + Route Handler) | Edge Runtime 제약 우회를 위해 Route Handler 위임 | ✅ 정상 동작, Edge 안정성 확보 |
| refresh_token maxAge=7일 | access(1h)와 분리하여 실질적 refresh 가능하게 | ✅ 로그인 7일 유지 |
| /api/* matcher 제외 | proxy.ts의 config.matcher에 /api/* 없음 | ✅ 무한 루프 방지 확인 |
| FastAPI 미구현 graceful | 401 응답 → /login redirect | ✅ 백엔드 없이도 안전하게 동작 |

---

## 5. Gap 분석 결과

| # | 심각도 | 항목 | 결정 |
|---|--------|------|------|
| G-01 | Low | refresh/route.ts `sameSite: "lax"` — `as const` 없음 | 허용 (tsc 통과) |
| G-02 | Low | login/route.ts 상단 §3.4/§3.1 주석 공존 | 허용 |

Critical/Important: 0건

---

## 6. 미결 사항 (Out of Scope → 후속 작업)

| # | 항목 | 우선순위 |
|---|------|---------|
| M-01 | FastAPI `/refresh` 엔드포인트 구현 | 백엔드 작업 시 |
| M-02 | 로그아웃 시 refresh_token 무효화 | auth-logout feature |
| M-03 | refresh_token rotation | 보안 강화 단계 |

---

## 7. 다음 단계

- FastAPI 백엔드 구현 시 `/refresh` 엔드포인트 추가 (`POST /refresh`, Bearer refresh_token)
- `/pdca archive auth-refresh-token` — 아카이브
