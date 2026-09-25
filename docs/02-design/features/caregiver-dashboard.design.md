# [Design] caregiver-dashboard

> 요양사 대시보드 — Option C Pragmatic 설계

**작성일**: 2026-09-23
**아키텍처**: Option C — Pragmatic Balance
**상태**: Design 완료

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | Milestone 4 두 번째 — 요양사가 방문 업무를 앱에서 직접 처리해야 서비스 완성 |
| **WHO** | 프론트 5년차 — Server/Client 혼합 패턴, Route Handler 프록시 숙지 |
| **RISK** | 상태 변경 후 UI 갱신 (`router.refresh()`), 기록 중복 제출 방지 |
| **SUCCESS** | `/caregiver` → 일정 카드 → 버튼 클릭 상태 변경 → 기록 폼 제출 성공 |
| **SCOPE** | 단일 페이지 `/caregiver` — 쓰기 포함 |

---

## 1. Overview

Option C를 선택한 이유:
- Route Handler 프록시는 auth-login에서 이미 확립된 패턴 → 일관성
- `ScheduleCard` 하나에 상태 버튼 + 기록 폼 통합 — 별도 분리는 현재 재사용처 없음 (YAGNI)
- `entities/senior`는 guardian-dashboard에서 이미 구현 → 재사용

**총 신규 파일**: 10개
**수정 파일**: 1개 (`app/caregiver/page.tsx`)

---

## 2. 디렉터리 구조

```
app/
  api/
    schedules/
      [scheduleId]/
        status/
          route.ts             ← PATCH 프록시 (신규)
    records/
      route.ts                 ← POST 프록시 (신규)
  caregiver/
    page.tsx                   ← Server Component (수정)
    loading.tsx                ← skeleton (신규)
    error.tsx                  ← 'use client' (신규)

src/
  features/
    caregiver-dashboard/
      api/
        updateScheduleStatus.ts  ← Client fetch helper (신규)
        createRecord.ts          ← Client fetch helper (신규)
      ui/
        ScheduleCard.tsx         ← 'use client' — 상태 버튼 + 기록 폼 통합 (신규)
      index.ts                   ← public API (신규)
```

`entities/senior` — guardian-dashboard에서 구현됨, 그대로 재사용

---

## 3. 타입 설계

```typescript
// schema.d.ts 직접 참조 (재정의 없음)
import type { components } from '@shared/api/schema'

type ScheduleResponse    = components['schemas']['ScheduleResponse']
type ScheduleStatus      = components['schemas']['ScheduleStatus']
type SeniorResponse      = components['schemas']['SeniorResponse']  // entities/senior에서
```

---

## 4. Route Handler 설계

### 4.1 `app/api/schedules/[scheduleId]/status/route.ts`

```typescript
// Design Ref: §4.1 — auth-login 프록시 패턴 재사용
// Plan SC: SC-03, SC-04
import { NextResponse } from 'next/server'
import { SERVER_API_URL, getServerApiHeaders } from '@shared/api/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  const { scheduleId } = await params
  const body = await request.json()   // { status: ScheduleStatus }

  const res = await fetch(`${SERVER_API_URL}/schedules/${scheduleId}/status`, {
    method: 'PATCH',
    headers: await getServerApiHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: '상태 변경 실패' }))
    return NextResponse.json(error, { status: res.status })
  }
  return NextResponse.json(await res.json())
}
```

### 4.2 `app/api/records/route.ts`

```typescript
// Design Ref: §4.2 — POST 프록시, fhir_response: {} 자동 삽입
// Plan SC: SC-07
export async function POST(request: Request) {
  const body = await request.json()  // { senior_id, schedule_id?, visit_notes }
  const res = await fetch(`${SERVER_API_URL}/records`, {
    method: 'POST',
    headers: await getServerApiHeaders(),
    body: JSON.stringify({ ...body, fhir_response: {} }),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: '기록 저장 실패' }))
    return NextResponse.json(error, { status: res.status })
  }
  return NextResponse.json(await res.json())
}
```

---

## 5. Client Fetch Helpers

### 5.1 `updateScheduleStatus.ts`

```typescript
// Design Ref: §5.1 — Client Component에서 호출
import type { components } from '@shared/api/schema'
type ScheduleStatus = components['schemas']['ScheduleStatus']

export async function updateScheduleStatus(
  scheduleId: number,
  status: ScheduleStatus
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/schedules/${scheduleId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return { ok: false, error: data.detail ?? '상태 변경 실패' }
  }
  return { ok: true }
}
```

### 5.2 `createRecord.ts`

```typescript
export async function createRecord(payload: {
  senior_id: number
  schedule_id?: number
  visit_notes: string
}): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('/api/records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return { ok: false, error: data.detail ?? '기록 저장 실패' }
  }
  return { ok: true }
}
```

---

## 6. ScheduleCard 컴포넌트 설계

```typescript
'use client'
// Design Ref: §6 — 단일 Client Component: 상태 버튼 + 기록 폼 통합
// Plan SC: SC-02, SC-03, SC-04, SC-05, SC-06, SC-07, SC-08

interface Props {
  schedule: ScheduleResponse
  seniorName: string   // page에서 senior 목록 매핑 후 전달
}
```

**내부 상태:**
```typescript
const [status, setStatus]           = useState(schedule.status)
const [isPending, setIsPending]     = useState(false)
const [showForm, setShowForm]       = useState(false)
const [submitted, setSubmitted]     = useState(false)
const [formError, setFormError]     = useState<string | null>(null)
const router = useRouter()
```

**상태 전환 맵:**
```typescript
const NEXT_STATUS = {
  scheduled:   'in_progress',
  in_progress: 'completed',
  completed:   null,
  cancelled:   null,
} as const
```

**상태 변경 핸들러:**
```typescript
async function handleStatusChange() {
  const next = NEXT_STATUS[status]
  if (!next || isPending) return
  setIsPending(true)
  const result = await updateScheduleStatus(schedule.id, next)
  setIsPending(false)
  if (result.ok) {
    setStatus(next as ScheduleStatus)
    router.refresh()   // 서버 데이터 재검증
  }
}
```

**기록 폼 표시 조건:** `status === 'in_progress' || status === 'completed'`
**기록 제출 후:** `setSubmitted(true)` → 폼 숨김, 성공 메시지 표시

---

## 7. Page 설계

```typescript
// app/caregiver/page.tsx (Server Component)
// Design Ref: §7 — 초기 데이터 Server Component fetch + senior 매핑
import { fetchSeniors } from '@entities/senior'
import { fetchCaregiverSchedules } from '@features/caregiver-dashboard'  // GET /schedules
import { ScheduleCard } from '@features/caregiver-dashboard'
import { SeniorCard } from '@features/guardian-dashboard'  // 재사용

export default async function CaregiverPage() {
  const [seniors, schedules] = await Promise.all([
    fetchSeniors(),
    fetchCaregiverSchedules(),
  ])

  // senior_id → name 매핑 (Plan Known Constraint 대응)
  const seniorMap = Object.fromEntries(seniors.map(s => [s.id, s.full_name]))

  return (
    <main>
      <h1>오늘의 방문 일정</h1>
      {schedules.map(s => (
        <ScheduleCard
          key={s.id}
          schedule={s}
          seniorName={seniorMap[s.senior_id] ?? `어르신 #${s.senior_id}`}
        />
      ))}
      <section>
        <h2>담당 어르신</h2>
        {seniors.map(s => <SeniorCard key={s.id} senior={s} />)}
      </section>
    </main>
  )
}
```

> `SeniorCard`는 guardian-dashboard feature에서 export됨 — `@features/guardian-dashboard`

---

## 8. FSD Import 확인

```
app/caregiver/page.tsx
  → @entities/senior              ✅ (app → entities)
  → @features/caregiver-dashboard ✅ (app → features)
  → @features/guardian-dashboard  ✅ (app → features, SeniorCard 재사용)

app/api/schedules/.../route.ts
  → @shared/api/server            ✅ (Route Handler → shared)

features/caregiver-dashboard/api/
  → (브라우저 fetch, 서버 의존성 없음)  ✅
```

---

## 9. 구현 순서 (Implementation Guide)

### 9.1 Module Map

| Module | 파일 | 의존성 |
|--------|------|--------|
| M1: Route Handlers | `app/api/schedules/[id]/status/route.ts`, `app/api/records/route.ts` | shared/api/server |
| M2: Feature API | `features/caregiver-dashboard/api/{updateScheduleStatus,createRecord}.ts`, `index.ts` | schema.d.ts |
| M3: ScheduleCard | `features/caregiver-dashboard/ui/ScheduleCard.tsx` | M2 |
| M4: App 라우트 | `app/caregiver/{page,loading,error}.tsx` | M2, M3, entities/senior |

### 9.2 구현 순서

```
1. M1: Route Handlers (PATCH status + POST records)
2. M2: Client fetch helpers + index.ts
3. M3: ScheduleCard (상태 버튼 + 기록 폼)
4. M4: app/caregiver/page.tsx + loading + error
```

### 9.3 Session Guide

**단일 세션 구현 가능** (총 10파일, 약 300줄 예상)

---

## 10. Success Criteria 매핑

| SC | 구현 위치 |
|----|----------|
| SC-01 일정 목록 | `app/caregiver/page.tsx` + `fetchCaregiverSchedules` |
| SC-02 일정 정보 표시 | `ScheduleCard.tsx` |
| SC-03 scheduled→in_progress | `ScheduleCard.tsx` handleStatusChange |
| SC-04 in_progress→completed | `ScheduleCard.tsx` handleStatusChange |
| SC-05 상태 변경 후 UI 갱신 | `router.refresh()` |
| SC-06 기록 폼 표시 조건 | `ScheduleCard.tsx` showForm 조건 |
| SC-07 기록 제출 → POST | `createRecord` + `/api/records/route.ts` |
| SC-08 어르신 목록 | `SeniorCard` (guardian-dashboard 재사용) |
| SC-09 Authorization 헤더 | Route Handler `getServerApiHeaders()` |
| SC-10 미인증 차단 | `proxy.ts` (기존) |
