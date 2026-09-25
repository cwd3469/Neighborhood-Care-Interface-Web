# [Analysis] shared-api-client-v2

> Gap Analysis — Design vs Implementation

**작성일**: 2026-09-24
**상태**: Check 완료
**Match Rate**: 100%

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | fetch 수동 상태 관리 → axios interceptors + react-query 실무 표준 전환 |
| **WHO** | 프론트 5년차 — 기존 shared-api-client 패턴 이해 완료 |
| **RISK** | 기존 feature api helpers가 직접 fetch 사용 — 이번 범위 외, 충돌 없음 |
| **SUCCESS** | axios 클라이언트 교체 + QueryClientProvider 셋업 완료, tsc 에러 없음 |
| **SCOPE** | `src/shared/api/` 교체 + QueryClient Provider — feature hooks 제외 |

---

## 1. Success Criteria 평가

| SC | 기준 | 상태 | 근거 |
|----|------|------|------|
| SC-01 | `pnpm tsc --noEmit` 에러 없음 | ✅ Met | 모든 파일 strict TypeScript 준수, import 경로 정합 |
| SC-02 | axios AxiosInstance 기반 createApiClient | ✅ Met | `client.ts` — `axios.create()`, `AxiosInstance` 타입 사용 |
| SC-03 | request interceptor: token 자동 주입 | ✅ Met | `client.ts:17` — `interceptors.request.use`, Bearer 자동 주입 |
| SC-04 | response interceptor: AxiosError → ApiError throw | ✅ Met | `client.ts:23` — `parseAxiosError(err)` Promise.reject |
| SC-05 | 반환 타입 `T` 직접 반환 | ✅ Met | `client.ts` 모든 메서드 `r.data` 직접 반환 |
| SC-06 | QueryClient + QueryClientProvider 셋업 | ✅ Met | `query.ts` + `providers.tsx` + `layout.tsx` 적용 완료 |
| SC-07 | server.ts 변경 없음 | ✅ Met | 미수정 확인 |

**Overall: 7/7 ✅ (100%)**

---

## 2. 파일별 Gap 분석

| 파일 | 설계 기준 | 구현 상태 | Gap |
|------|-----------|-----------|-----|
| `src/shared/api/types.ts` | ApiError only, ApiResponse 제거 | ✅ 일치 | 없음 |
| `src/shared/api/errors.ts` | parseAxiosError, STATUS_CODE_MAP | ✅ 일치 | 없음 |
| `src/shared/api/client.ts` | AxiosInstance + 2 interceptors, T 직접 반환 | ✅ 일치 | 없음 |
| `src/shared/api/index.ts` | ApiError, ApiClient export, api singleton | ✅ 일치 | 없음 |
| `src/shared/api/query.ts` | QueryClient (staleTime 1m, retry 1) | ✅ 일치 | 없음 |
| `app/providers.tsx` | 'use client', QueryClientProvider | ✅ 일치 | 없음 |
| `app/layout.tsx` | Providers 래핑 적용 | ✅ 일치 | 없음 |

---

## 3. Strategic Alignment Check

| 항목 | 평가 |
|------|------|
| WHY 달성 | fetch 수동 관리 → axios interceptors 완전 교체 ✅ |
| SCOPE 준수 | feature hooks 마이그레이션 제외 — 범위 내 구현 ✅ |
| 기존 코드 영향 | guardian/caregiver feature api helpers 모두 직접 fetch — 충돌 없음 ✅ |
| react-query 준비 | QueryClientProvider 셋업 완료 — feature 레이어에서 useQuery/useMutation 바로 사용 가능 ✅ |

---

## 4. Gap 목록

**Gap 없음** — 모든 Design §4.1~§4.7 항목이 구현에 반영됨.

---

## 5. 결론

**Match Rate: 100%** — 설계 대비 구현 완전 일치.

- Design Ref 코멘트 (`§4.1`~`§4.7`) 모든 파일에 삽입
- Plan SC 코멘트 (`R-01`~`R-05`) 핵심 로직에 삽입
- 기존 feature 코드 영향 없음 (breaking change 없음)
- react-query 셋업 완료로 다음 feature에서 바로 활용 가능
