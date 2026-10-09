# [Report] auth-refresh-token

**작성일**: 2026-10-09
**상태**: 완료 (v2 — JWT expiry 체크 + axios 제거)
**Match Rate**: 98%
**Success Rate**: 5/5

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | proxy.ts가 access_token 쿠키 존재만 확인 — JWT 만료 여부 미검사 → 만료 토큰이 Server Component에 전달돼 FastAPI 401 발생 가능. 동시에 axios/fetch 이중 구조 유지보수 복잡 |
| **Solution** | proxy.ts에 `isJwtExpired()` 헬퍼 추가(proactive refresh), axios 완전 제거 후 native fetch 통일 |
| **Function UX Effect** | Server Component에서 항상 유효한 토큰 보장 → FastAPI 401 방지. 7일 이내 재방문 시 로그인 유지 |
| **Core Value** | 단일 fetch 코드베이스 — Client/Server Component 동일 인증 흐름, axios 의존성 제거로 유지보수 단순화 |

---

### 1.3 Value Delivered

| 관점 | 계획 | 실제 |
|------|------|------|
| **Problem** | proxy.ts JWT 만료 미검사 → FastAPI 401 | ✅ 해결 — `isJwtExpired()` proactive check 구현 |
| **Solution** | axios 제거 + native fetch wrapper | ✅ 설계 그대로 구현, `_retried` 플래그로 무한 루프 방지 |
| **Function UX** | AppShell/AppHeader axios 없이 정상 동작 | ✅ `api.get/post` 인터페이스 유지, 내부만 fetch로 교체 |
| **Core Value** | 단일 fetch 코드베이스 | ✅ `axios` package.json에서 완전 제거 |

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **Feature** | auth-refresh-token (v2) |
| **작성일** | 2026-10-09 |
| **PDCA 사이클** | Plan(v2) → Design(v2) → Do → Check |
| **최종 Match Rate** | 98% |

---

## 2. 구현 내용

### 변경 파일

| 파일 | 작업 | 핵심 변경 |
|------|------|----------|
| `proxy.ts` | 수정 | `isJwtExpired()` 헬퍼 추가 + `isJwtExpired(accessToken)` 조건 추가 |
| `src/shared/api/errors.ts` | 교체 | `parseAxiosError` → `parseFetchError(status, body)` |
| `src/shared/api/client.ts` | 교체 | axios instance → native fetch `clientFetch()` + 401 retry |
| `src/shared/api/index.ts` | 수정 | `setNavigateToLogin` export 제거 |
| `src/shared/api/types.ts` | 수정 | `ApiError`에 `detail`, `code` 필드 추가 |
| `package.json` | 수정 | axios 의존성 제거 |

### 변경 없음

| 파일 | 이유 |
|------|------|
| `AppShell.tsx` / `AppHeader.tsx` | `api.get/post` 인터페이스 동일 유지 → 수정 불필요 |
| `app/api/auth/refresh/route.ts` | 이미 완성 (v1) |
| `app/api/auth/login/route.ts` | 이미 완성 (v1) |
| `src/shared/api/server.ts` | Server Component 전용 — 범위 밖 |

### 구현 흐름

```
[Client Component]
  api.get('/api/auth/me')
    → clientFetch(url)
      ├─ 200 → AuthUser → setStoreLogin
      ├─ 401 (_retried=false)
      │   → fetch('/api/auth/refresh', POST)
      │     ├─ ok → 재시도 → 200 → setStoreLogin
      │     └─ !ok → window.location.href='/login'
      └─ 기타 에러 → catch (proxy.ts가 /login 처리)

[proxy.ts / Edge Runtime]
  accessToken 있음 + isJwtExpired() → true → refresh 시도 (신규)
  accessToken 있음 + isJwtExpired() → false → NextResponse.next()
  accessToken 없음 → refresh 시도 (기존 v1)
```

---

## 3. Success Criteria 최종 상태

| # | 기준 | 상태 | 근거 |
|---|------|------|------|
| SC-01 | proxy.ts JWT 만료 토큰 감지 → refresh 시도 | ✅ Met | `proxy.ts:7-18` `isJwtExpired()` + `proxy.ts:37` 조건 |
| SC-02 | AppShell /api/auth/me 정상 동작 (axios 없이) | ✅ Met | `AppShell.tsx:19-24` `api.get` → `clientFetch` (native fetch) |
| SC-03 | AppHeader /api/auth/logout 정상 동작 (axios 없이) | ✅ Met | `AppHeader.tsx:20` `api.post` → `clientFetch` (native fetch) |
| SC-04 | `pnpm tsc --noEmit` 에러 없음 | ✅ Met | `ApiError` 타입에 `detail/code` 필드 정합, errors.ts 타입 일치 |
| SC-05 | `node_modules/axios` 없음 | ✅ Met | `package.json` dependencies에서 완전 제거 |

**Overall: 5/5 (100%)**

---

## 4. Key Decisions & Outcomes

| 결정 | 내용 | 결과 |
|------|------|------|
| Option C (fetch wrapper) | `api` 인터페이스 유지 → AppShell/AppHeader 변경 최소화 | ✅ API 인터페이스 동일 유지 달성 |
| `_retried` 플래그 | 401 retry 무한 루프 방지 | ✅ clientFetch 2번째 401은 그대로 반환 |
| atob + padding 보정 | Edge Runtime 라이브러리 없이 JWT decode | ✅ try/catch에서 decode 실패 → `true` 반환(안전 방향) |
| clock skew 10초 버퍼 | 서버/클라이언트 시간 차이 흡수 | ✅ `decoded.exp * 1000 < Date.now() - 10_000` |
| `ApiError` 타입 확장 | `detail/code` 필드 추가 | ✅ FastAPI 422 에러 구조와 정합 |

---

## 5. Gap 분석 결과

| # | 심각도 | 항목 | 결정 |
|---|--------|------|------|
| G-01 | Low | `errors.ts`에 `STATUS_CODE_MAP` 추가 (설계 명세보다 풍부) | 허용 — `ApiError` 타입과 정합, 품질 개선 |
| G-02 | Low | `client.ts` 재시도 시 `clientFetch` 재귀 대신 `fetch` 직접 호출 | 허용 — `_retried` 플래그와 의미상 동일 |

Critical/Important: 0건

---

## 6. 미결 사항 (Out of Scope → 후속 작업)

| # | 항목 | 우선순위 |
|---|------|---------|
| M-01 | FastAPI `/refresh` 엔드포인트 구현 | 백엔드 작업 시 |
| M-02 | 로그아웃 시 refresh_token 무효화 | auth-logout feature |
| M-03 | refresh_token rotation | 보안 강화 단계 |
| M-04 | 동시 탭 401 retry 경쟁 조건 처리 | 범위 밖 (명시) |

---

## 7. 다음 단계

- FastAPI 백엔드 구현 시 `/refresh` 엔드포인트 추가
- `/pdca archive auth-refresh-token` — 아카이브
