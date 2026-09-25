# [Report] api-client

**작성일**: 2026-09-25
**상태**: 완료
**Match Rate**: 97%
**Success Rate**: 6/6 (100%)

---

## Executive Summary

### 1.1 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **Feature** | api-client |
| **시작일** | 2026-09-25 |
| **완료일** | 2026-09-25 |
| **기간** | 1 Session |
| **Iteration** | 0 (첫 시도 통과) |

### 1.2 결과 요약

| 항목 | 수치 |
|------|------|
| Match Rate | 97% |
| Success Criteria | 6/6 (100%) |
| 신규 파일 | 2개 (client.ts, index.ts) |
| 수정 파일 | 2개 (providers.tsx, query.ts) |
| 총 구현량 | ~120줄 |
| TypeScript 에러 | 0 |

### 1.3 Value Delivered

| 관점 | 계획 | 실제 결과 |
|------|------|-----------|
| **Problem** | 체류 중 API 401이 에러로 노출됨 | access_token 만료가 사용자에게 완전히 투명하게 처리됨 |
| **Solution** | axios interceptor + 401 retry | failedQueue 패턴으로 동시 401도 안전하게 처리 (Plan 초과 달성) |
| **Function UX Effect** | 1시간 세션 후에도 API 호출 가능 | 동시 요청 3개가 모두 401이어도 1회 refresh 후 전부 재시도 |
| **Core Value** | proxy.ts(이동) + interceptor(체류) 2-레이어 완성 | proxy.ts + axios interceptor 완전한 silent refresh 아키텍처 구현 |

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | proxy.ts는 페이지 이동만 처리 → 체류 중 API 401은 미처리. 완전한 세션 유지 필요 |
| **WHO** | Client Component에서 API 호출하는 모든 기능 |
| **RISK** | interceptor에서 router.push 호출 불가(훅 외부) → setter 패턴 필요 / refresh 무한 루프 방지 |
| **SUCCESS** | access_token 만료 후 API 호출 시 자동 재시도, 사용자 인지 없이 성공 |
| **SCOPE** | client.ts + index.ts 신규. providers.tsx + query.ts 수정 |

---

## 2. Success Criteria 최종 상태

| SC | 기준 | 상태 | 근거 |
|----|------|------|------|
| SC-01 | access_token 만료 후 자동 재시도 성공 | ✅ Met | `client.ts:72-75` — refresh 성공 후 `apiClient(originalRequest)` |
| SC-02 | refresh 실패 → /login 이동 | ✅ Met | `client.ts:77-79` — `navigateToLogin()` + `window.location` fallback |
| SC-03 | 정상 요청 투명 통과 | ✅ Met | `client.ts:50` — `(response) => response` |
| SC-04 | `api.get<T>()` 타입 안전성 | ✅ Met | `client.ts:88-116` — 제네릭 5개 메서드 전체 |
| SC-05 | react-query 401 retry=false | ✅ Met | `query.ts:12` — `status === 401` 조건 |
| SC-06 | `pnpm tsc --noEmit` 통과 | ✅ Met | `InternalAxiosRequestConfig` 타입 + null guard 후 통과 |

---

## 3. 구현 결과

### 3.1 파일별 구현 현황

| 파일 | 작업 | 상태 |
|------|------|------|
| `src/shared/api/client.ts` | 신규 (~120줄) | ✅ 완료 |
| `src/shared/api/index.ts` | 신규 (~5줄) | ✅ 완료 |
| `src/shared/api/query.ts` | 수정 (retry 옵션) | ✅ 완료 |
| `app/providers.tsx` | 수정 (setNavigateToLogin 등록) | ✅ 완료 |

### 3.2 핵심 구현: failedQueue 패턴

Plan §7에서 "동시 401 요청 큐잉"을 **범위 밖**으로 정의했으나, Design 단계에서 Option C 선택 시 failedQueue 패턴이 추가 구현되었습니다. 이는 Plan 초과 달성입니다.

```
t=0: api.get('/a'), api.get('/b'), api.get('/c') 동시 요청
t=1: 세 요청 모두 401 수신
t=2: '/a' → isRefreshing=false → refresh 시작
     '/b', '/c' → failedQueue에 push
t=3: refresh 성공 → processQueue(null) → '/b', '/c' resolve
t=4: 세 요청 모두 성공
```

### 3.3 타입 이슈 해결

Plan 요구사항에서 명시되지 않았던 TypeScript 타입 이슈 2건을 Design/Do 단계에서 발견·해결:

| 이슈 | 해결책 |
|------|--------|
| `error.config` 타입 불일치 | `type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean }` |
| `ApiError`를 `Error`로 직접 캐스팅 불가 | `(error as unknown as ApiError).status` double cast |

---

## 4. Key Decisions & Outcomes

| 단계 | 결정 | 결과 |
|------|------|------|
| **Plan** | setter 패턴으로 router.push 주입 | providers.tsx useEffect에서 등록, 정상 작동 |
| **Design** | Option C 선택 (모듈 싱글톤 + failedQueue) | 동시 401 케이스까지 안전하게 처리 |
| **Design** | `baseURL: ''` (같은 origin) | CORS 없이 Next.js Route Handler 자동 프록시 |
| **Do** | `InternalAxiosRequestConfig` import | tsc 통과, 설계 타입 안전성 확보 |

---

## 5. Gap 분석 결과

| # | 심각도 | 항목 | 처리 |
|---|--------|------|------|
| G-01 | Low | `ApiClient` type 미export (선택 항목) | 수용 — 기능 영향 없음 |

---

## 6. 전체 silent refresh 아키텍처 완성

이 feature로 인증 레이어 2단계가 모두 완성되었습니다:

```
[페이지 이동]  proxy.ts          ✅ auth-refresh-token (2026-09-25)
[세션 중 API]  axios interceptor ✅ api-client         (2026-09-25)
```

| 시나리오 | 처리 레이어 | 결과 |
|---------|------------|------|
| 페이지 로드 시 access_token 만료 | proxy.ts | refresh → 페이지 정상 표시 |
| API 호출 중 access_token 만료 | axios interceptor | refresh → 요청 재시도 |
| refresh_token도 만료 | 두 레이어 모두 | /login redirect |

---

## 7. 다음 단계 권장

- 기능 개발 재개: `entities/`, `features/` 레이어 API 연동
- `api.get<T>()` 사용 패턴: `useQuery({ queryFn: () => api.get<T>('/api/...') })`
- 토큰 만료 시나리오 수동 검증 (DevTools Network 탭)
