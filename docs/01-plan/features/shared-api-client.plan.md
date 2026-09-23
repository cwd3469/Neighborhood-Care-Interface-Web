# [Plan] shared-api-client

> src/shared/api/ — FastAPI 타입 기반 fetch wrapper 구현

**작성일**: 2026-09-19
**Milestone**: Milestone 2 (FastAPI 백엔드 골격) 병행 또는 직후
**상태**: Plan 완료

---

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | shared-api-client |
| **작성일** | 2026-09-19 |
| **위치** | `src/shared/api/` |

### Value Delivered (4 Perspectives)

| 관점 | 내용 |
|------|------|
| **Problem** | 각 feature(record-health-metric, match-visit-schedule 등)가 `fetch()`를 직접 호출하면 에러 핸들링·헤더·base URL이 중복되고, FastAPI ValidationError(422) 같은 백엔드 특유 응답을 일관되게 처리할 수 없다 |
| **Solution** | `shared/api/`에 타입 제네릭 기반 fetch wrapper를 두고, 모든 feature가 `api.get<T>()` 형태로 통일된 인터페이스를 사용하게 한다 |
| **Function UX Effect** | 각 feature 개발자가 fetch 세부 사항 대신 도메인 로직에 집중할 수 있고, API 에러 UI 처리가 `error.status` 하나로 통일된다 |
| **Core Value** | 포트폴리오 어필 — "도메인 무관 공통 레이어(shared)에서 API 클라이언트를 추상화해 FSD 계층 의존성 원칙을 지켰다"는 설계 근거 설명 가능 |

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 중복 fetch 제거 + FastAPI 응답/에러 타입 통일 — 이후 모든 API 연동 feature의 기반 |
| **WHO** | 프론트 개발자 1인 (5년차) — 구현 원리 중심으로 설명 |
| **RISK** | 백엔드 API 스펙 미확정 상태이므로 실제 엔드포인트 없이 타입/인터페이스만 잘 설계해야 나중에 바꿀 일 없음 |
| **SUCCESS** | `api.get<T>()` 호출이 TypeScript 에러 없이 동작 + `ApiError` 타입 export 가능 |
| **SCOPE** | fetch wrapper + 타입 정의 + setAuthToken stub — 실제 JWT 토큰 획득/갱신 로직은 인증 feature에서 |

---

## 1. 요구사항

### 1.1 포함 범위

| # | 요구사항 | 우선순위 |
|---|---------|---------|
| R-01 | `createApiClient(baseUrl)` 팩토리 함수 — 싱글톤 인스턴스 export | P0 |
| R-02 | `get<T>`, `post<T>`, `put<T>`, `patch<T>`, `delete<T>` 메서드 (제네릭) | P0 |
| R-03 | Wrapped 응답 타입: `ApiResponse<T> = { data: T \| null, error: ApiError \| null, status: number }` | P0 |
| R-04 | `ApiError` 타입: `{ status: number, message: string, detail: unknown, code: string }` | P0 |
| R-05 | `NEXT_PUBLIC_API_URL` 환경변수로 base URL 설정 | P0 |
| R-06 | `api.setAuthToken(token: string \| null)` — Authorization 헤더 주입 준비 | P1 |
| R-07 | `Content-Type: application/json` 기본 헤더 | P0 |
| R-08 | FastAPI 422 ValidationError `{ detail: [...] }` 응답을 `ApiError.detail`에 그대로 매핑 | P0 |

### 1.2 제외 범위

- 실제 JWT 토큰 획득/갱신 로직 (인증 feature)
- FormData / multipart 파일 업로드 (추후 필요 시)
- 요청 취소 (AbortController) — 추후 필요 시
- 캐싱 레이어 (SWR / TanStack Query 도입 시 별도 wrapper)
- 실제 FastAPI 엔드포인트 호출 테스트 (백엔드 스펙 확정 후)

---

## 2. 타입 설계

```typescript
// src/shared/api/types.ts

export interface ApiError {
  status: number;     // HTTP 상태 코드
  message: string;    // 사람이 읽을 수 있는 에러 메시지
  detail: unknown;    // FastAPI detail 필드 (422: { detail: [...] })
  code: string;       // 커스텀 에러 코드 (예: "UNAUTHORIZED", "NOT_FOUND")
}

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  status: number;
}
```

### FastAPI 에러 응답 매핑 로직

| HTTP 상태 | FastAPI 응답 형태 | ApiError.code |
|-----------|-----------------|---------------|
| 400 | `{ detail: "..." }` | `BAD_REQUEST` |
| 401 | `{ detail: "..." }` | `UNAUTHORIZED` |
| 403 | `{ detail: "..." }` | `FORBIDDEN` |
| 404 | `{ detail: "..." }` | `NOT_FOUND` |
| 422 | `{ detail: [{ loc, msg, type }] }` | `VALIDATION_ERROR` |
| 500 | `{ detail: "..." }` | `INTERNAL_ERROR` |
| Network fail | — | `NETWORK_ERROR` |

---

## 3. API 클라이언트 인터페이스

```typescript
// 사용 예시 (feature에서)
import { api } from '@shared/api'

// GET — 환자 목록
const { data, error } = await api.get<Patient[]>('/patients')

// POST — 건강수치 등록
const { data, error } = await api.post<Observation>('/observations', {
  body: observationPayload
})

// 인증 토큰 설정 (인증 feature에서 호출)
api.setAuthToken(jwtToken)  // 이후 모든 요청에 Bearer 헤더 자동 포함
api.setAuthToken(null)      // 로그아웃 시 토큰 제거
```

---

## 4. 파일 구조

```
src/shared/api/
  index.ts          # api 싱글톤 export (현재 placeholder → 교체)
  client.ts         # createApiClient 팩토리 + ApiClient 클래스/객체
  types.ts          # ApiResponse<T>, ApiError 타입 정의
  errors.ts         # HTTP 상태 → ApiError 변환 헬퍼
```

---

## 5. 환경변수

```
# .env.local (새로 생성)
NEXT_PUBLIC_API_URL=http://localhost:8000
```

> `NEXT_PUBLIC_` 접두사 필수 — Next.js에서 클라이언트 번들에 포함됨.
> 프로덕션 값은 Vercel 환경변수로 별도 관리 (커밋에 포함하지 않음).

---

## 6. 구현 체크리스트

- [ ] `src/shared/api/types.ts` — `ApiError`, `ApiResponse<T>` 타입 정의
- [ ] `src/shared/api/errors.ts` — HTTP 응답 → `ApiError` 변환 함수
- [ ] `src/shared/api/client.ts` — `createApiClient` 구현 (get/post/put/patch/delete)
- [ ] `src/shared/api/index.ts` — `export {}` 교체, `api` 싱글톤 export
- [ ] `.env.local` 생성 (`NEXT_PUBLIC_API_URL`)
- [ ] `.env.local.example` 생성 (커밋용 예시 파일)
- [ ] TypeScript 컴파일 에러 없음 확인

---

## 7. 리스크 및 주의사항

| 리스크 | 대응 |
|--------|------|
| FastAPI 에러 응답 형식이 나중에 바뀔 수 있음 | `errors.ts`에서 변환 로직을 한 곳에 집중 — 수정 범위 최소화 |
| `detail: unknown`이 너무 느슨함 | 각 feature에서 `detail`을 narrowing하거나, 나중에 zod로 런타임 검증 추가 |
| 싱글톤 api 인스턴스가 서버/클라이언트 양쪽에서 공유됨 | Next.js App Router: Server Component에서 직접 fetch 사용 권장, Client Component에서만 api 싱글톤 사용 |
