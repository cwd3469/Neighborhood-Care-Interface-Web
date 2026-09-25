# [Plan] caregiver-dashboard

> 요양사 대시보드 — 일정 확인 + 상태 변경 + 방문 기록 작성

**작성일**: 2026-09-23
**상태**: Plan 완료

---

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | caregiver-dashboard |
| **Milestone** | 4 — 프론트 대시보드 3종 연동 (두 번째) |
| **관련 엔드포인트** | GET /schedules, GET /seniors, PATCH /schedules/{id}/status, POST /records |

### Value Delivered (4 Perspectives)

| 관점 | 내용 |
|------|------|
| **Problem** | 요양사가 오늘 일정 확인 + 방문 상태 업데이트 + 기록 작성을 한 화면에서 처리할 수 없음 |
| **Solution** | 단일 `/caregiver` 페이지 — 초기 데이터 Server Component, 상태 변경·기록 작성은 Route Handler 프록시 + Client Component |
| **Function UX Effect** | 일정 카드에서 `scheduled→in_progress→completed` 버튼 클릭 + 완료/진행중 일정에 `visit_notes` 인라인 제출 |
| **Core Value** | Server/Client Component 혼합 패턴 + Route Handler 프록시 재사용 — guardian(읽기)과 대비되는 쓰기 패턴 면접 어필 |

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | Milestone 4 두 번째 — 요양사가 방문 업무를 앱에서 직접 처리해야 서비스 완성 |
| **WHO** | 프론트 5년차 — Server/Client 혼합 패턴, Route Handler 프록시 숙지 (auth-login 선례) |
| **RISK** | 상태 변경 후 UI 갱신 방식 (router.refresh() vs optimistic update), fhir_response 빈 객체 처리 |
| **SUCCESS** | `/caregiver` → 일정 카드 → 상태 버튼 → 즉시 반영, 기록 작성 폼 제출 → POST /records 성공 |
| **SCOPE** | 단일 페이지 `/caregiver` — 쓰기 포함, admin 대시보드는 별도 feature |

---

## 1. 요구사항

### 1.1 기능 요구사항

| # | 요구사항 | 우선순위 |
|---|----------|----------|
| R-01 | `/caregiver` 진입 시 본인 일정 목록 표시 (JWT 기준 백엔드 필터) | Must |
| R-02 | 일정 카드: scheduled_date, start_time~end_time, 어르신 이름, 현재 status 표시 | Must |
| R-03 | 상태 전환 버튼: `scheduled→in_progress`, `in_progress→completed` (순방향만) | Must |
| R-04 | 상태 변경 시 `PATCH /api/schedules/{id}/status` → Route Handler → FastAPI | Must |
| R-05 | 상태 변경 후 즉시 UI 갱신 (`router.refresh()`) | Must |
| R-06 | `in_progress` 또는 `completed` 상태 일정에 "기록 작성" 인라인 폼 표시 | Must |
| R-07 | 폼: `visit_notes` textarea, 제출 시 `POST /api/records` → Route Handler → FastAPI | Must |
| R-08 | 기록 제출 후 폼 숨김 + 성공 메시지 | Must |
| R-09 | 담당 어르신 목록 별도 섹션 (`entities/senior` 재사용) | Should |
| R-10 | 모든 인증 fetch `Authorization: Bearer {token}` 헤더 | Must |

### 1.2 비기능 요구사항

| # | 요구사항 |
|---|----------|
| NF-01 | 초기 데이터(일정 + 어르신 목록)는 Server Component에서 fetch |
| NF-02 | 상태 변경·기록 작성 버튼/폼은 Client Component ('use client') |
| NF-03 | Route Handler에서 `getServerApiHeaders()` 사용해 FastAPI 인증 프록시 |
| NF-04 | 로딩: `loading.tsx` skeleton / 에러: `error.tsx` |

### 1.3 Known Constraints

| 제약 | 대응 |
|------|------|
| `fhir_response` 필드 필수 | `{}` 빈 객체로 전송 (Q3 결정) |
| `senior_name` 없음 | `GET /seniors`로 어르신 목록 사전 로드, `seniorId → name` 매핑 |
| `caregiver_id` 검증 불가 | 백엔드에서 JWT 기준 권한 검증 — 프론트는 신뢰 |

---

## 2. API 매핑

| 기능 | 엔드포인트 | 방향 | 비고 |
|------|-----------|------|------|
| 일정 목록 | `GET /schedules` | Server Component | JWT 기준 본인 일정만 반환 |
| 어르신 목록 | `GET /seniors` | Server Component | `entities/senior` 재사용 |
| 상태 변경 | `PATCH /api/schedules/{id}/status` | Client → Route Handler → FastAPI | |
| 기록 작성 | `POST /api/records` | Client → Route Handler → FastAPI | `fhir_response: {}` |

---

## 3. 화면 구조

```
/caregiver                          ← 단일 페이지

  [Server Component] 초기 데이터 fetch
    ├─ 오늘의 일정 섹션
    │    └─ ScheduleCard × N        ← [Client Component]
    │         ├─ 일정 정보 (날짜/시간/어르신)
    │         ├─ 상태 전환 버튼 (scheduled→in_progress→completed)
    │         └─ 기록 작성 인라인 폼 (in_progress/completed일 때)
    │              └─ visit_notes textarea + 제출 버튼
    └─ 담당 어르신 섹션
         └─ SeniorCard × N          ← entities/senior 재사용
```

---

## 4. 라우트 및 파일 계획

```
app/
  api/
    schedules/
      [scheduleId]/
        status/
          route.ts                   ← PATCH 프록시
    records/
      route.ts                       ← POST 프록시
  caregiver/
    page.tsx                         ← Server Component (수정)
    loading.tsx
    error.tsx

src/
  features/caregiver-dashboard/
    api/
      updateScheduleStatus.ts        ← Client fetch helper
      createRecord.ts                ← Client fetch helper
    ui/
      ScheduleCard.tsx               ← 'use client' — 상태 버튼 + 기록 폼
      ScheduleStatusBadge.tsx        ← 상태 표시 (순수 UI)
    index.ts
```

---

## 5. 상태 전환 로직

```typescript
// 순방향 전환만 허용
const NEXT_STATUS: Record<string, string | null> = {
  scheduled:   'in_progress',
  in_progress: 'completed',
  completed:   null,   // 더 이상 전환 없음
  cancelled:   null,
}
```

버튼 표시 조건: `NEXT_STATUS[status] !== null`

---

## 6. Route Handler 프록시 설계

### `app/api/schedules/[scheduleId]/status/route.ts`

```typescript
// auth-login 패턴과 동일: cookie → Bearer token forward
export async function PATCH(req, { params }) {
  const { status } = await req.json()
  const res = await fetch(`${API_URL}/schedules/${params.scheduleId}/status`, {
    method: 'PATCH',
    headers: await getServerApiHeaders(),
    body: JSON.stringify({ status }),
  })
  // ...
}
```

### `app/api/records/route.ts`

```typescript
export async function POST(req) {
  const body = await req.json()  // { senior_id, schedule_id?, visit_notes }
  const res = await fetch(`${API_URL}/records`, {
    method: 'POST',
    headers: await getServerApiHeaders(),
    body: JSON.stringify({ ...body, fhir_response: {} }),
  })
  // ...
}
```

---

## 7. Success Criteria

| # | 기준 | 검증 방법 |
|---|------|----------|
| SC-01 | `/caregiver` 접근 시 본인 일정 목록 렌더링 | 화면 확인 |
| SC-02 | 일정 카드에 날짜·시간·어르신 이름·상태 표시 | 화면 확인 |
| SC-03 | `scheduled` 카드에 "방문 시작" 버튼 → `in_progress` 전환 | 버튼 클릭 |
| SC-04 | `in_progress` 카드에 "방문 완료" 버튼 → `completed` 전환 | 버튼 클릭 |
| SC-05 | 상태 변경 후 UI 즉시 갱신 | 화면 확인 |
| SC-06 | `in_progress`/`completed` 카드에 기록 작성 폼 표시 | 화면 확인 |
| SC-07 | 기록 폼 제출 → POST /records 성공 → 폼 숨김 | Network 확인 |
| SC-08 | 담당 어르신 목록 표시 | 화면 확인 |
| SC-09 | 모든 API 호출 `Authorization` 헤더 전송 | Network 확인 |
| SC-10 | 미인증 접근 → `/login` 리디렉션 | 직접 URL 접근 |

---

## 8. 리스크

| # | 리스크 | 심각도 | 대응 |
|---|--------|--------|------|
| R-01 | 상태 변경 후 `router.refresh()` 지연 | Low | pending 중 버튼 disabled |
| R-02 | 기록 중복 제출 | Medium | 제출 중 버튼 disabled + 성공 후 폼 숨김 |
| R-03 | 일정 0건인 요양사 | Low | empty state UI |
| R-04 | `senior_name` 매핑 실패 | Low | fallback: `어르신 #${senior_id}` |

---

## 9. 다음 단계

- `/pdca design caregiver-dashboard`
- 이후: admin-dashboard
