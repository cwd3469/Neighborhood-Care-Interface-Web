# [Design] guardian-dashboard

> 보호자 대시보드 — Option C Pragmatic 설계

**작성일**: 2026-09-23
**아키텍처**: Option C — Pragmatic Balance
**상태**: Design 완료

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | Milestone 4 첫 번째 — 보호자 역할 대시보드 없으면 전체 서비스 미완성 |
| **WHO** | 프론트 5년차 — App Router Server Component, FSD 숙지, FHIR 문진 경험 보유 |
| **RISK** | `ScheduleResponse`에 caregiver 이름 없음(ID만); 병렬 fetch 중 일부 실패 처리 |
| **SUCCESS** | `/guardian` → 어르신 목록 → 클릭 → `/guardian/[seniorId]` 활력징후·일정·기록 실데이터 |
| **SCOPE** | 보호자 대시보드(읽기 전용) — caregiver/admin 대시보드는 별도 feature |

---

## 1. Overview

Option C를 선택한 이유:
- `senior` 엔티티는 caregiver/admin 대시보드에서도 재사용 확실 → 분리 타당
- schedules/records/vitals는 현재 guardian-dashboard에서만 사용 → feature 내 유지 (YAGNI)
- FSD import 규칙 준수하면서 파일 수 최소화

**총 신규 파일**: 12개
**수정 파일**: 2개 (`app/guardian/page.tsx`, `app/guardian/[seniorId]/page.tsx` 신규 생성)

---

## 2. 디렉터리 구조

```
src/
  entities/
    senior/
      api/
        index.ts               ← fetchSeniors(), fetchSenior(id)
      model/
        types.ts               ← SeniorResponse 타입 (schema.d.ts 참조)
      index.ts                 ← public API: { SeniorResponse, fetchSeniors, fetchSenior }

  features/
    guardian-dashboard/
      api/
        schedules.ts           ← fetchSchedules(seniorId)
        records.ts             ← fetchRecords(seniorId)
        vitals.ts              ← fetchVitals(seniorId)
      ui/
        SeniorCard.tsx         ← 목록용 카드 (이름, 생년월일, 성별)
        SeniorInfoPanel.tsx    ← 상세 기본정보 패널
        VitalsPanel.tsx        ← 활력징후 테이블 (최근 5건)
        ScheduleList.tsx       ← 방문 일정 목록
        VisitRecordList.tsx    ← 방문 기록 목록
      index.ts                 ← public API

app/
  guardian/
    page.tsx                   ← 어르신 목록 (Server Component)
    loading.tsx                ← Suspense skeleton
    error.tsx                  ← 오류 처리
    [seniorId]/
      page.tsx                 ← 상세 대시보드 (Server Component)
      loading.tsx
      error.tsx
```

---

## 3. 타입 설계

### 3.1 `src/entities/senior/model/types.ts`

`schema.d.ts`의 `components["schemas"]["SeniorResponse"]`를 그대로 참조.
별도 재정의 없이 타입 alias만 export:

```typescript
import type { components } from '@shared/api/schema'

export type SeniorResponse = components['schemas']['SeniorResponse']
```

### 3.2 `src/features/guardian-dashboard` 타입

마찬가지로 `schema.d.ts`에서 직접 참조:

```typescript
import type { components } from '@shared/api/schema'

type ScheduleResponse    = components['schemas']['ScheduleResponse']
type ScheduleStatus      = components['schemas']['ScheduleStatus']
type VisitRecordResponse = components['schemas']['VisitRecordResponse']
type VitalObservation    = components['schemas']['VitalObservationResponse']
```

> **포인트**: openapi-typescript로 생성된 타입을 재정의하지 않고 직접 참조 → 백엔드 스키마 변경 시 자동 반영.

---

## 4. API 레이어 설계

### 4.1 `src/entities/senior/api/index.ts`

```typescript
// Design Ref: §4.1 — Server Component 전용 fetch, getServerApiHeaders() 사용
import { SERVER_API_URL, getServerApiHeaders } from '@shared/api/server'
import type { SeniorResponse } from '../model/types'

export async function fetchSeniors(): Promise<SeniorResponse[]> {
  const res = await fetch(`${SERVER_API_URL}/seniors`, {
    headers: await getServerApiHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`fetchSeniors failed: ${res.status}`)
  return res.json()
}

export async function fetchSenior(seniorId: number): Promise<SeniorResponse> {
  const res = await fetch(`${SERVER_API_URL}/seniors/${seniorId}`, {
    headers: await getServerApiHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`fetchSenior failed: ${res.status}`)
  return res.json()
}
```

### 4.2 `src/features/guardian-dashboard/api/schedules.ts`

```typescript
import { SERVER_API_URL, getServerApiHeaders } from '@shared/api/server'
import type { components } from '@shared/api/schema'

type ScheduleResponse = components['schemas']['ScheduleResponse']

export async function fetchSchedules(seniorId: number): Promise<ScheduleResponse[]> {
  const res = await fetch(
    `${SERVER_API_URL}/schedules?senior_id=${seniorId}`,
    { headers: await getServerApiHeaders(), cache: 'no-store' }
  )
  if (!res.ok) throw new Error(`fetchSchedules failed: ${res.status}`)
  return res.json()
}
```

> records.ts / vitals.ts 동일 패턴. vitals는 `?limit=5` 쿼리 추가.

### 4.3 병렬 fetch 전략 (상세 페이지)

```typescript
// app/guardian/[seniorId]/page.tsx
// Design Ref: §4.3 — Promise.allSettled로 부분 실패 허용
const [seniorRes, schedulesRes, recordsRes, vitalsRes] = await Promise.allSettled([
  fetchSenior(id),
  fetchSchedules(id),
  fetchRecords(id),
  fetchVitals(id),
])

const senior    = seniorRes.status    === 'fulfilled' ? seniorRes.value    : null
const schedules = schedulesRes.status === 'fulfilled' ? schedulesRes.value : []
const records   = recordsRes.status   === 'fulfilled' ? recordsRes.value   : []
const vitals    = vitalsRes.status    === 'fulfilled' ? vitalsRes.value    : []
```

`senior`가 null이면 `notFound()` 호출. 나머지는 빈 배열 → 각 컴포넌트에서 empty state 처리.

---

## 5. 라우트 설계

### 5.1 `/guardian` — 목록 페이지

```typescript
// app/guardian/page.tsx (Server Component)
import { fetchSeniors } from '@entities/senior'
import { SeniorCard } from '@features/guardian-dashboard'

export default async function GuardianPage() {
  const seniors = await fetchSeniors()
  // Plan SC: SC-01
  if (seniors.length === 0) return <EmptyState />  // TODO: empty state UI
  return (
    <main>
      <h1>담당 어르신</h1>
      <ul>
        {seniors.map(s => <SeniorCard key={s.id} senior={s} />)}
      </ul>
    </main>
  )
}
```

### 5.2 `/guardian/[seniorId]` — 상세 페이지

```typescript
// app/guardian/[seniorId]/page.tsx (Server Component)
// params: { seniorId: string }
// Plan SC: SC-02 ~ SC-07
```

`SeniorInfoPanel`, `VitalsPanel`, `ScheduleList`, `VisitRecordList` 4개 컴포넌트를 수직 배치.

---

## 6. UI 컴포넌트 설계

| 컴포넌트 | props | 비고 |
|----------|-------|------|
| `SeniorCard` | `senior: SeniorResponse` | Link to `/guardian/{id}` |
| `SeniorInfoPanel` | `senior: SeniorResponse` | 이름/생년월일/성별/주소/medical_notes |
| `VitalsPanel` | `vitals: VitalObservationResponse[]` | 테이블: display_name, value, unit, observed_at |
| `ScheduleList` | `schedules: ScheduleResponse[]` | status==='scheduled' 필터 후 렌더링 |
| `VisitRecordList` | `records: VisitRecordResponse[]` | recorded_at + visit_notes |

모두 **'use client' 없는 Server Component**. 상태 관리 불필요 (읽기 전용).

### 6.1 ScheduleList — caregiver_id 표시 방식

```typescript
// TODO: 백엔드에서 ScheduleResponse에 caregiver_name 필드 추가되면 교체
// Plan Known Constraint: caregiver 이름은 현재 API로 조회 불가
<span>요양사 #{schedule.caregiver_id}</span>
```

---

## 7. 에러/로딩 처리

| 파일 | 역할 |
|------|------|
| `app/guardian/loading.tsx` | 목록 skeleton UI |
| `app/guardian/error.tsx` | 목록 fetch 실패 ('use client' + reset) |
| `app/guardian/[seniorId]/loading.tsx` | 상세 skeleton UI |
| `app/guardian/[seniorId]/error.tsx` | 상세 fetch 실패 |

---

## 8. FSD Import 규칙 확인

```
app/guardian/page.tsx
  → import from @entities/senior      ✅ (app → entities)
  → import from @features/guardian-dashboard  ✅ (app → features)

features/guardian-dashboard/api/
  → import from @shared/api/server    ✅ (features → shared)
  → import from @shared/api/schema    ✅ (features → shared)

entities/senior/api/
  → import from @shared/api/server    ✅ (entities → shared)
```

---

## 9. 구현 순서 (Implementation Guide)

### 9.1 Module Map

| Module | 파일 | 의존성 |
|--------|------|--------|
| M1: 타입 + 엔티티 | `entities/senior/model/types.ts`, `entities/senior/api/index.ts`, `entities/senior/index.ts` | schema.d.ts |
| M2: Feature API | `features/guardian-dashboard/api/{schedules,records,vitals}.ts`, `features/guardian-dashboard/index.ts` | M1, shared/api/server |
| M3: UI 컴포넌트 | `features/guardian-dashboard/ui/*.tsx` | M1, M2 타입 |
| M4: App 라우트 | `app/guardian/**`, `app/guardian/[seniorId]/**` | M1, M2, M3 |

### 9.2 구현 순서

```
1. M1: entities/senior (타입 → api → index)
2. M2: features/guardian-dashboard/api/* + index.ts
3. M3: features/guardian-dashboard/ui/* (컴포넌트)
4. M4: app/guardian/page.tsx + loading + error
5. M4: app/guardian/[seniorId]/page.tsx + loading + error
```

### 9.3 Session Guide

**단일 세션 구현 가능** (총 12파일, 약 350줄 예상)

```
Session 1 (full scope):
  M1 → M2 → M3 → M4
  또는
  /pdca do guardian-dashboard --scope M1,M2
  /pdca do guardian-dashboard --scope M3,M4
```

---

## 10. Success Criteria 매핑

| SC | 구현 위치 |
|----|----------|
| SC-01 어르신 목록 | `app/guardian/page.tsx` + `SeniorCard` |
| SC-02 카드 클릭 → 상세 | `SeniorCard` Link |
| SC-03 기본 정보 | `SeniorInfoPanel` |
| SC-04 활력징후 5건 | `VitalsPanel` + `fetchVitals` |
| SC-05 방문 일정 | `ScheduleList` + `fetchSchedules` |
| SC-06 방문 기록 | `VisitRecordList` + `fetchRecords` |
| SC-07 Authorization 헤더 | `getServerApiHeaders()` in all fetch |
| SC-08 미인증 차단 | `proxy.ts` (기존, 추가 코드 없음) |
