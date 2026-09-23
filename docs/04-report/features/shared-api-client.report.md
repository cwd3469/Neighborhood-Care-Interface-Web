# [Report] shared-api-client

> FastAPI 타입 기반 fetch wrapper — 완료 보고서

**완료일**: 2026-09-19
**Match Rate**: 100%
**Iteration**: 0회

---

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | shared-api-client |
| **완료일** | 2026-09-19 |
| **Match Rate** | 100% |
| **생성 파일** | 4개 (types/errors/client/index) + .env.local.example |

### Value Delivered (4 Perspectives) — 실제 결과

| 관점 | 결과 |
|------|------|
| **Problem** | 각 feature의 중복 fetch 호출 문제 해결 — 통일된 `api.get<T>()` 인터페이스 제공 |
| **Solution** | Closure Factory 패턴으로 token 상태 캡슐화, 4파일 책임 분리, FSD `index.ts` public API 원칙 준수 |
| **Function UX Effect** | `error.code === 'VALIDATION_ERROR'` 한 줄로 FastAPI 422 처리 가능, 네트워크 오류도 `NETWORK_ERROR` code로 일관 처리 |
| **Core Value** | `createApiClient` 팩토리 패턴 + 클로저 — "왜 클래스 대신 팩토리인가"를 면접에서 설명 가능 (this 없음, 테스트 격리, destructuring 안전) |

---

## Key Decisions & Outcomes

| 결정 | 결과 |
|------|------|
| Wrapped `{ data, error, status }` 응답 | feature에서 null 체크로 에러 처리 가능 — try/catch 불필요 |
| Closure Factory (클래스 미사용) | `this` 바인딩 없음, `const { get } = api` destructuring 안전 |
| `request` 비공개 | `index.ts` public API만 노출 — FSD 원칙 유지 |
| `detail: unknown` 타입 | FastAPI 422 배열과 단순 문자열 모두 보존, feature에서 narrowing |
| 204 처리 분리 | FHIR DELETE 등 body 없는 응답에서 json() 파싱 오류 방지 |
| TypeScript 수정 1건 | `export {} from` + `사용`의 동일 파일 불가 → `import` 후 `export` 분리 |

---

## 성공 기준 최종 상태

**8/8 (100%)** — 모든 Plan 요구사항 충족

---

## 생성된 산출물

```
src/shared/api/
  types.ts          ApiError, ApiResponse<T> 순수 타입
  errors.ts         parseError() — FastAPI 응답 → ApiError
  client.ts         createApiClient() + ApiClient 타입
  index.ts          api 싱글톤 + public API re-export
.env.local.example  NEXT_PUBLIC_API_URL 예시
```

---

## 다음 단계

- **Milestone 2**: FastAPI 백엔드 골격 구현 → `NEXT_PUBLIC_API_URL` 연결
- **인증 feature 구현 시**: `api.setAuthToken(jwtToken)` 호출로 JWT 주입 완성
- **각 feature 구현 시**: `import { api } from '@shared/api'` 후 바로 사용
