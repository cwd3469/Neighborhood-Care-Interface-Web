# [Report] shared-api-client-v2

> fetch 기반 shared-api-client → axios + react-query 전환 완료 보고서

**작성일**: 2026-09-25
**상태**: 완료
**Match Rate**: 100%

---

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | shared-api-client-v2 |
| **기간** | 2026-09-24 ~ 2026-09-25 |
| **Match Rate** | 100% (7/7 SC) |
| **신규 파일** | 2개 (`query.ts`, `providers.tsx`) |
| **수정 파일** | 5개 (`client.ts`, `errors.ts`, `types.ts`, `index.ts`, `layout.tsx`) |
| **변경 없음** | 1개 (`server.ts`) |

### Value Delivered (4 Perspectives)

| 관점 | 계획 | 실제 결과 |
|------|------|-----------|
| **Problem** | fetch 수동 상태 관리 — 중복 코드 | ✅ axios interceptors로 token 주입/에러 처리 자동화 |
| **Solution** | AxiosInstance + QueryClientProvider | ✅ createApiClient 교체 + QueryClientProvider 앱 루트 적용 |
| **Function UX Effect** | feature에서 useQuery/useMutation 바로 사용 | ✅ QueryClient 셋업 완료 — 다음 feature부터 즉시 활용 가능 |
| **Core Value** | axios + react-query 실무 표준 스택 | ✅ interceptor 패턴 + 서버 상태 캐싱 기반 완성 |

---

## 1. 구현 결과

### 1.1 파일 변경 요약

| 파일 | 변경 | 내용 |
|------|------|------|
| `src/shared/api/types.ts` | 수정 | `ApiResponse<T>` 제거, `ApiError` 유지 |
| `src/shared/api/errors.ts` | 수정 | `parseError(Response)` → `parseAxiosError(AxiosError)` |
| `src/shared/api/client.ts` | 수정 | fetch → AxiosInstance, request/response interceptors |
| `src/shared/api/index.ts` | 수정 | `ApiResponse` export 제거, 공개 API 정리 |
| `src/shared/api/query.ts` | 신규 | QueryClient 인스턴스 (staleTime 1분, retry 1) |
| `app/providers.tsx` | 신규 | `'use client'` QueryClientProvider 래핑 |
| `app/layout.tsx` | 수정 | `<Providers>` 적용 (Server Component 유지) |
| `src/shared/api/server.ts` | 변경 없음 | Route Handler용 native fetch 유지 |

### 1.2 의존성

| 패키지 | 역할 |
|--------|------|
| `axios` | AxiosInstance, request/response interceptors |
| `@tanstack/react-query` v5 | QueryClient, QueryClientProvider (React 19 호환) |

---

## 2. Success Criteria 최종 결과

| SC | 기준 | 결과 | 근거 |
|----|------|------|------|
| SC-01 | TypeScript 에러 없음 | ✅ Met | strict 모드, 모든 파일 타입 정합 |
| SC-02 | axios AxiosInstance 기반 createApiClient | ✅ Met | `client.ts` — `axios.create()` |
| SC-03 | request interceptor: token 자동 주입 | ✅ Met | `client.ts:17` Bearer 헤더 |
| SC-04 | response interceptor: AxiosError → ApiError | ✅ Met | `client.ts:23` + `errors.ts` |
| SC-05 | 반환 타입 T 직접 반환 | ✅ Met | 모든 메서드 `r.data` 반환 |
| SC-06 | QueryClient + QueryClientProvider 셋업 | ✅ Met | `query.ts` + `providers.tsx` + `layout.tsx` |
| SC-07 | server.ts 변경 없음 | ✅ Met | 미수정 확인 |

**Overall Success Rate: 7/7 (100%)**

---

## 3. Key Decisions & Outcomes

| 의사결정 | 선택 | 결과 |
|----------|------|------|
| [Plan] 에러 처리 방식 | throw ApiError (ApiResponse<T> 래퍼 제거) | ✅ react-query error state로 자연스럽게 처리 |
| [Plan] 범위 | shared/api + QueryClient 셋업만, feature hooks 제외 | ✅ breaking change 없음, 기존 feature 영향 없음 |
| [Design] 아키텍처 옵션 | C — Pragmatic (`api/` 단일 디렉토리 + `query.ts` 추가) | ✅ 응집력 유지, 최소 변경으로 완료 |
| [Design] providers.tsx 위치 | `app/` (Next.js App Router 루트) | ✅ Server Component 깨짐 없이 'use client' 경계 올바르게 분리 |

---

## 4. 기존 코드 영향 분석

| 항목 | 결과 |
|------|------|
| `guardian-dashboard` feature api helpers | 직접 `fetch` 사용 — 영향 없음 |
| `caregiver-dashboard` feature api helpers | 직접 `fetch` 사용 — 영향 없음 |
| `ai-summary` feature (`getSummary`, `triggerSummary`) | 직접 `fetch` 사용 — 영향 없음 |
| `server.ts` (Route Handler headers helper) | 변경 없음 — 영향 없음 |

---

## 5. 다음 단계

- **feature hooks 마이그레이션**: guardian/caregiver feature api helpers를 `useQuery`/`useMutation`으로 전환 (별도 PDCA 범위)
- **인증 feature**: `api.setAuthToken(jwtToken)` 활용하여 로그인/로그아웃 구현
- **서버 상태 캐싱**: 각 feature에서 `queryClient` + custom hooks로 데이터 fetching 최적화
