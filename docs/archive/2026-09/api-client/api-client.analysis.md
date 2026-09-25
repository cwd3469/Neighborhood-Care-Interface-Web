# [Analysis] api-client

**작성일**: 2026-09-25
**상태**: Check 완료
**Match Rate**: 97%
**Iteration**: 0

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 페이지 체류 중 API 401 시 자동 refresh+재시도 없음 → 사용자에게 에러 노출 |
| **WHO** | Client Component에서 api.get/post를 사용하는 모든 기능 |
| **RISK** | 동시 401 중복 refresh / interceptor에서 useRouter 불가 / 무한 루프 |
| **SUCCESS** | access_token 만료 후 API 호출이 사용자 인지 없이 성공 |
| **SCOPE** | client.ts + index.ts 신규, providers.tsx + query.ts 수정 |

---

## 1. Success Criteria 평가

| SC | 항목 | 상태 | 근거 |
|----|------|------|------|
| SC-01 | 자동 재시도 성공 | ✅ Met | `client.ts:60-67` failedQueue + `74-75` processQueue(null) + retry |
| SC-02 | refresh 실패 → /login | ✅ Met | `client.ts:78` navigateToLogin() + `21` window.location fallback |
| SC-03 | 정상 요청 투명 통과 | ✅ Met | `client.ts:50` `(response) => response` |
| SC-04 | 타입 안전성 | ✅ Met | `client.ts:88-116` api.get<T>() 제네릭 전체 |
| SC-05 | 401 react-query retry=false | ✅ Met | `query.ts:12` status === 401 → return false |
| SC-06 | tsc --noEmit 통과 | ✅ Met | InternalAxiosRequestConfig + null check 수정 후 통과 |

**Success Rate: 6/6 (100%)**

---

## 2. Design vs Implementation Gap 분석

### 2.1 `src/shared/api/client.ts` (M1)

| 설계 항목 | 구현 여부 | 비고 |
|-----------|-----------|------|
| `"use client"` 상단 선언 | ✅ | line 3 |
| `setNavigateToLogin` export | ✅ | line 12 |
| `navigateToLogin` window.location fallback | ✅ | lines 16-23 |
| `QueueItem` 타입 + `isRefreshing` + `failedQueue` | ✅ | lines 26-31 |
| `processQueue` 함수 | ✅ | lines 33-39 |
| `axios.create({ baseURL: '', withCredentials: true })` | ✅ | lines 42-46 |
| response interceptor: 401 아닌 경우 pass-through | ✅ | line 57 |
| `originalRequest._retry` 무한 루프 방지 | ✅ | lines 56, 69 |
| `isRefreshing` 큐 대기 분기 | ✅ | lines 60-67 |
| `POST /api/auth/refresh` 호출 | ✅ | line 73 |
| refresh 성공 → `processQueue(null)` + 재시도 | ✅ | lines 74-75 |
| refresh 실패 → `processQueue(error)` + `navigateToLogin()` | ✅ | lines 77-79 |
| `finally { isRefreshing = false }` | ✅ | lines 80-82 |
| `api.{get,post,put,patch,delete}<T>` 5개 메서드 | ✅ | lines 88-116 |
| `originalRequest` null guard | ✅ | line 53 (설계에 없던 타입 안전성 강화) |

**M1 매치율**: 15/15 ✅

### 2.2 `src/shared/api/index.ts` (M2)

| 설계 항목 | 구현 여부 | 비고 |
|-----------|-----------|------|
| `api, setNavigateToLogin` re-export from `./client` | ✅ | line 3 |
| `queryClient` re-export from `./query` | ✅ | line 4 |
| `ApiError` type re-export | ✅ | line 5 |
| `server.ts` re-export 없음 | ✅ | 주석으로 명시 |
| `ApiClient` type re-export (선택) | ⚠️ | 미구현 — 설계 §3에서 "선택" 명시 |

**M2 매치율**: 4/4 필수 ✅ (선택 1건 미구현)

### 2.3 `app/providers.tsx` (M4)

| 설계 항목 | 구현 여부 | 비고 |
|-----------|-----------|------|
| `setNavigateToLogin` import from `@shared/api` | ✅ | line 9 |
| `useEffect` 내 setter 등록 | ✅ | lines 19-22 |
| `[router]` 의존성 배열 | ✅ | line 22 |
| `QueryClientProvider client={queryClient}` | ✅ | line 25 |
| `AuthProvider` 중첩 | ✅ | line 26 |

**M4 매치율**: 5/5 ✅

### 2.4 `src/shared/api/query.ts` (M3)

| 설계 항목 | 구현 여부 | 비고 |
|-----------|-----------|------|
| `staleTime: 1000 * 60` | ✅ | line 9 |
| `retry` 함수 정의 | ✅ | lines 10-13 |
| `status === 401` → `return false` | ✅ | line 12 |
| `failureCount < 1` fallback | ✅ | line 13 |

**M3 매치율**: 4/4 ✅

---

## 3. 갭 목록

| # | 심각도 | 항목 | 위치 | 내용 |
|---|--------|------|------|------|
| G-01 | Low | `ApiClient` type 미export | `index.ts` | 설계 §3에서 "선택" 명시. 기능 영향 없음. |

**Critical**: 0건 / **Important**: 0건 / **Low**: 1건

---

## 4. 엣지 케이스 검증

| 케이스 | 처리 여부 |
|--------|-----------|
| `_navigateToLogin` 미등록 시 refresh 실패 | ✅ window.location fallback |
| `/api/auth/refresh` 자체 401 | ✅ refreshError catch → navigateToLogin() |
| react-query retry가 401 재시도 | ✅ query.ts retry=false |
| providers.tsx useEffect 이전 API 호출 | ✅ window.location fallback |
| refresh 성공 후 originalRequest 재시도도 401 | ✅ `_retry: true` 플래그 |

---

## 5. 코드 품질 메모

- `RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean }` — 설계보다 타입 안전성 강화 (양호)
- `originalRequest` null guard 추가 — 설계에 없던 방어 코드 (양호)
- `(error as unknown as ApiError)` double cast — `ApiError`가 `Error`를 extend하지 않아 필요한 조치 (정상)

---

## 6. 결론

**Match Rate: 97%** (선택 항목 1건 미구현, 기능 영향 없음)

전체 6개 Success Criteria 100% 충족. 구현이 설계 스펙을 완전히 따르며, 일부 항목은 설계보다 타입 안전성이 강화되었습니다.

**권장 다음 단계**: `/pdca report api-client`
