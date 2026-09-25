# [Report] caregiver-dashboard

> 요양사 대시보드 — Server/Client 혼합 패턴 + Route Handler 프록시 완료 보고서

**완료일**: 2026-09-23
**Match Rate**: 100%
**Iteration**: 0회

---

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | caregiver-dashboard |
| **완료일** | 2026-09-23 |
| **Match Rate** | 100% |
| **생성 파일** | 9개 신규 + 1개 수정 |

### Value Delivered (4 Perspectives)

| 관점 | 결과 |
|------|------|
| **Problem** | 요양사가 방문 일정 확인·상태 업데이트·기록 작성을 한 화면에서 처리할 수 없었음 → 단일 `/caregiver` 페이지로 완전 해결 |
| **Solution** | Server Component 초기 fetch + Route Handler 프록시 + Client Component — guardian-dashboard(읽기)와 대비되는 쓰기 패턴 완성 |
| **Function UX Effect** | 일정 카드에서 `scheduled→in_progress→completed` 버튼 클릭 + 완료/진행중 일정에 `visit_notes` 인라인 제출, 빈 일정 empty state 처리 |
| **Core Value** | Route Handler 프록시 패턴 재사용 일관성 + `NEXT_STATUS` 순방향 전환 맵 + 기록 중복 제출 방지 — Server/Client 혼합 쓰기 패턴 면접 어필 포인트 |

---

## Key Decisions & Outcomes

| 결정 | 결과 |
|------|------|
| Option C Pragmatic 아키텍처 | `ScheduleCard` 하나에 상태 버튼 + 기록 폼 통합 — 재사용처 없어 분리 불필요 (YAGNI 준수) |
| Route Handler 프록시 재사용 | auth-login 패턴 그대로 재사용 → 일관성 유지, 신규 패턴 학습 비용 0 |
| `fhir_response: {}` Route Handler 자동 삽입 | 클라이언트에서 몰라도 되는 필드를 서버에서 처리 → 관심사 분리 |
| `seniorMap` id→name 매핑 | `ScheduleResponse`에 `senior_name` 없음 → Server Component에서 사전 매핑, fallback `어르신 #${id}` |
| `schema.d.ts` 직접 타입 참조 | 재정의 없이 type alias만 사용 → 백엔드 스키마 변경 자동 반영 |
| `isSubmitting` 기록 중복 제출 방지 | 폼 제출 중 버튼 disabled + 성공 후 `setSubmitted(true)` → 폼 완전 숨김 |

---

## 성공 기준 최종 상태

| # | 기준 | 상태 | 증거 |
|---|------|------|------|
| SC-01 | `/caregiver` 일정 목록 렌더링 | ✅ Met | `page.tsx:8` |
| SC-02 | 날짜·시간·어르신 이름·상태 표시 | ✅ Met | `ScheduleCard.tsx:88-98` |
| SC-03 | `scheduled` → `in_progress` | ✅ Met | `ScheduleCard.tsx:19,33` |
| SC-04 | `in_progress` → `completed` | ✅ Met | `ScheduleCard.tsx:20,34` |
| SC-05 | 상태 변경 후 UI 즉시 갱신 | ✅ Met | `ScheduleCard.tsx:56` `router.refresh()` |
| SC-06 | 기록 폼 표시 조건 | ✅ Met | `ScheduleCard.tsx:82` `canRecord` |
| SC-07 | 기록 제출 → POST → 폼 숨김 | ✅ Met | `ScheduleCard.tsx:61-78` |
| SC-08 | 담당 어르신 목록 | ✅ Met | `page.tsx:40-43` SeniorCard 재사용 |
| SC-09 | Authorization 헤더 | ✅ Met | Route Handlers `getServerApiHeaders()` |
| SC-10 | 미인증 차단 | ✅ Met | `proxy.ts` (기존) |

**10/10 (100%)**

---

## 생성된 산출물

```
app/
  api/
    schedules/[scheduleId]/status/
      route.ts              PATCH 프록시 (auth-login 패턴 재사용)
    records/
      route.ts              POST 프록시 (fhir_response: {} 자동 삽입)
  caregiver/
    page.tsx                Server Component (수정) — Promise.all + seniorMap
    loading.tsx             skeleton UI
    error.tsx               'use client' error boundary

src/features/caregiver-dashboard/
  api/schedules.ts          fetchCaregiverSchedules() — Server Component용
  api/updateScheduleStatus.ts  Client fetch helper → PATCH /api/schedules/{id}/status
  api/createRecord.ts       Client fetch helper → POST /api/records
  ui/ScheduleCard.tsx       'use client' — 상태 버튼 + 기록 폼 통합
  index.ts                  public API
```

---

## 다음 단계

- **Milestone 4 계속**: admin-dashboard 구현
- `entities/senior`는 admin-dashboard에서도 동일하게 재사용 가능
- 로그아웃: `app/api/auth/logout/route.ts` cookie 삭제 Route Handler (별도 feature)
- 백엔드 요청 사항: `ScheduleResponse`에 `caregiver_name` 필드 추가 (현재 numeric `caregiver_id`만 존재)
