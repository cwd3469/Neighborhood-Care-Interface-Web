# [Analysis] shared-api-client

**분석일**: 2026-09-19
**Match Rate**: 100%
**상태**: Check 완료

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 중복 fetch 제거 + FastAPI 에러 타입 통일 |
| **SUCCESS** | `api.get<T>()` TS 에러 없이 동작 + `ApiError` export |
| **SCOPE** | fetch wrapper + 타입 + setAuthToken stub |

---

## Success Criteria 평가

| # | 기준 | 상태 | 증거 |
|---|------|------|------|
| R-01 | createApiClient + api 싱글톤 | ✅ Met | client.ts:59, index.ts:17 |
| R-02 | 5개 HTTP 메서드 (제네릭) | ✅ Met | client.ts:74-87 |
| R-03 | ApiResponse<T> wrapped | ✅ Met | types.ts:15-19 |
| R-04 | ApiError 4개 필드 | ✅ Met | types.ts:4-13 |
| R-05 | NEXT_PUBLIC_API_URL | ✅ Met | index.ts:17 |
| R-06 | setAuthToken stub | ✅ Met | client.ts:70-72 |
| R-07 | Content-Type: application/json | ✅ Met | client.ts:64 |
| R-08 | FastAPI 422 → detail 매핑 | ✅ Met | errors.ts:25 |

**Overall: 8/8 (100%)**

---

## Design Spec 대조

| 항목 | 상태 |
|------|------|
| 4파일 구조 (types/errors/client/index) | ✅ |
| 의존 방향 단방향 (index→client→errors→types) | ✅ |
| request 내부 미노출 | ✅ |
| 204 No Content 처리 | ✅ |
| NETWORK_ERROR catch | ✅ |
| headers() 매 요청 재호출 | ✅ |
| ApiClient type export | ✅ |

---

## Gap 목록

**없음** — iterate 불필요.
