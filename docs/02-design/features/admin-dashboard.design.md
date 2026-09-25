# [Design] admin-dashboard

> 관리자 대시보드 — Option C Pragmatic 설계

**작성일**: 2026-09-24
**아키텍처**: Option C — Pragmatic Balance
**상태**: Design 완료

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | Milestone 4 마지막 — 관리자 Full CRUD 없으면 3종 대시보드 패턴 미완성 |
| **WHO** | 프론트 5년차 — guardian(읽기)/caregiver(제한 쓰기) 패턴 확립 완료 |
| **RISK** | ScheduleTable 복잡도 (드롭다운 + 수정/삭제 동시), 어르신 삭제 시 연관 일정 에러 |
| **SUCCESS** | `/admin` → 사용자 비활성화·어르신 CRUD·일정 CRUD 전부 작동 |
| **SCOPE** | 단일 페이지 `/admin` — 사용자 생성 제외 (API 없음) |

---

## 1. Overview

Option C를 선택한 이유:
- `caregiver-dashboard`와 동일한 flat feature 구조 → 프로젝트 내 패턴 완전 일관성
- 3개 Client Component를 별도 sub-section으로 분리하는 것은 현재 재사용처 없음 (YAGNI)
- Route Handler + Client helper 분리는 caregiver에서 검증된 패턴 그대로 재사용
- `entities/senior`는 guardian/caregiver에서 이미 구현 → `fetchSeniors()` 재사용

**총 신규 파일**: 17개
**수정 파일**: 1개 (`app/admin/page.tsx`)

---

## 2. 디렉터리 구조

```
src/
  features/
    admin-dashboard/
      api/
        fetchAdminUsers.ts       ← GET /admin/users (Server helper)
        fetchAllSchedules.ts     ← GET /schedules (Server helper, 필터 없음)
        deactivateUser.ts        ← PATCH Client helper
        seniors.ts               ← createSenior, updateSenior, deleteSenior (Client)
        schedules.ts             ← createSchedule, updateSchedule, deleteSchedule (Client)
      ui/
        UserTable.tsx            ← 'use client'
        SeniorTable.tsx          ← 'use client' 인라인 CRUD
        ScheduleTable.tsx        ← 'use client' 드롭다운 + 인라인 CRUD
      index.ts                   ← public API

app/
  api/
    admin/
      users/
        [userId]/
          deactivate/
            route.ts             ← PATCH 프록시 (신규)
    seniors/
      route.ts                   ← POST 프록시 (신규)
      [seniorId]/
        route.ts                 ← PUT + DELETE 프록시 (신규)
    schedules/
      route.ts                   ← POST 프록시 (신규)
      [scheduleId]/
        route.ts                 ← PUT + DELETE 프록시 (신규)
        status/
          route.ts               ← PATCH (기존, caregiver-dashboard — 무충돌)
  admin/
    page.tsx                     ← Server Component (수정)
    loading.tsx                  ← skeleton (신규)
    error.tsx                    ← 'use client' (신규)
```

`entities/senior` — `fetchSeniors()` 그대로 재사용

---

## 3. 타입 설계

```typescript
// schema.d.ts 직접 참조 (재정의 없음)
import type { components } from '@shared/api/schema'

type UserResponse   = components['schemas']['UserResponse']
type UserRole       = components['schemas']['UserRole']
type SeniorResponse = components['schemas']['SeniorResponse']
type SeniorCreate   = components['schemas']['SeniorCreate']
type SeniorUpdate   = components['schemas']['SeniorUpdate']
type ScheduleResponse = components['schemas']['ScheduleResponse']
type ScheduleCreate   = components['schemas']['ScheduleCreate']
type ScheduleUpdate   = components['schemas']['ScheduleUpdate']
```

> `ScheduleCreate` 필수 필드: `senior_id`, `caregiver_id`, `scheduled_date`, `start_time`, `end_time`
> `SeniorCreate` 필수 필드: `full_name`, `birth_date`, `gender`

---

## 4. Route Handler 설계

### 4.1 `app/api/admin/users/[userId]/deactivate/route.ts`

```typescript
// Design Ref: §4.1 — body 없는 PATCH (deactivate는 request body 불필요)
// Plan SC: SC-03
import { NextResponse } from 'next/server'
import { SERVER_API_URL, getServerApiHeaders } from '@shared/api/server'

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  const res = await fetch(`${SERVER_API_URL}/admin/users/${userId}/deactivate`, {
    method: 'PATCH',
    headers: await getServerApiHeaders(),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: '비활성화 실패' }))
    return NextResponse.json(error, { status: res.status })
  }
  return NextResponse.json(await res.json())
}
```

### 4.2 `app/api/seniors/route.ts`

```typescript
// Design Ref: §4.2 — SeniorCreate POST 프록시
// Plan SC: SC-04
export async function POST(request: Request) {
  const body = await request.json()
  const res = await fetch(`${SERVER_API_URL}/seniors`, {
    method: 'POST',
    headers: await getServerApiHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: '어르신 등록 실패' }))
    return NextResponse.json(error, { status: res.status })
  }
  return NextResponse.json(await res.json())
}
```

### 4.3 `app/api/seniors/[seniorId]/route.ts`

```typescript
// Design Ref: §4.3 — PUT + DELETE 하나의 파일에 (Next.js App Router 표준)
// Plan SC: SC-05, SC-06
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ seniorId: string }> }
) {
  const { seniorId } = await params
  const body = await request.json()
  const res = await fetch(`${SERVER_API_URL}/seniors/${seniorId}`, {
    method: 'PUT',
    headers: await getServerApiHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: '수정 실패' }))
    return NextResponse.json(error, { status: res.status })
  }
  return NextResponse.json(await res.json())
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ seniorId: string }> }
) {
  const { seniorId } = await params
  const res = await fetch(`${SERVER_API_URL}/seniors/${seniorId}`, {
    method: 'DELETE',
    headers: await getServerApiHeaders(),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: '삭제 실패' }))
    return NextResponse.json(error, { status: res.status })
  }
  return NextResponse.json(await res.json())
}
```

### 4.4 `app/api/schedules/route.ts`

```typescript
// Design Ref: §4.4 — ScheduleCreate POST 프록시
// Plan SC: SC-07
// 주의: app/api/schedules/[scheduleId]/status/route.ts (caregiver) 와 충돌 없음
export async function POST(request: Request) {
  const body = await request.json()
  const res = await fetch(`${SERVER_API_URL}/schedules`, {
    method: 'POST',
    headers: await getServerApiHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: '일정 생성 실패' }))
    return NextResponse.json(error, { status: res.status })
  }
  return NextResponse.json(await res.json())
}
```

### 4.5 `app/api/schedules/[scheduleId]/route.ts`

```typescript
// Design Ref: §4.5 — PUT + DELETE (status/route.ts 와 경로 다름, 무충돌)
// Plan SC: SC-08, SC-09
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  const { scheduleId } = await params
  const body = await request.json()
  const res = await fetch(`${SERVER_API_URL}/schedules/${scheduleId}`, {
    method: 'PUT',
    headers: await getServerApiHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: '일정 수정 실패' }))
    return NextResponse.json(error, { status: res.status })
  }
  return NextResponse.json(await res.json())
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  const { scheduleId } = await params
  const res = await fetch(`${SERVER_API_URL}/schedules/${scheduleId}`, {
    method: 'DELETE',
    headers: await getServerApiHeaders(),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: '일정 삭제 실패' }))
    return NextResponse.json(error, { status: res.status })
  }
  return NextResponse.json(await res.json())
}
```

---

## 5. Server Fetch Helpers

### 5.1 `src/features/admin-dashboard/api/fetchAdminUsers.ts`

```typescript
// Design Ref: §5.1 — Server Component 전용, getServerApiHeaders() 사용
import { SERVER_API_URL, getServerApiHeaders } from '@shared/api/server'
import type { components } from '@shared/api/schema'

type UserResponse = components['schemas']['UserResponse']

export async function fetchAdminUsers(): Promise<UserResponse[]> {
  const res = await fetch(`${SERVER_API_URL}/admin/users`, {
    headers: await getServerApiHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`fetchAdminUsers failed: ${res.status}`)
  return res.json()
}
```

### 5.2 `src/features/admin-dashboard/api/fetchAllSchedules.ts`

```typescript
import { SERVER_API_URL, getServerApiHeaders } from '@shared/api/server'
import type { components } from '@shared/api/schema'

type ScheduleResponse = components['schemas']['ScheduleResponse']

export async function fetchAllSchedules(): Promise<ScheduleResponse[]> {
  const res = await fetch(`${SERVER_API_URL}/schedules`, {
    headers: await getServerApiHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`fetchAllSchedules failed: ${res.status}`)
  return res.json()
}
```

---

## 6. Client Fetch Helpers

헬퍼 반환 타입 패턴은 `caregiver-dashboard`와 동일: `{ ok: boolean; error?: string }`.

### 6.1 `deactivateUser.ts`

```typescript
// Design Ref: §6.1 — body 없는 PATCH
export async function deactivateUser(
  userId: number
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/admin/users/${userId}/deactivate`, {
    method: 'PATCH',
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return { ok: false, error: data.detail ?? '비활성화 실패' }
  }
  return { ok: true }
}
```

### 6.2 `seniors.ts`

```typescript
import type { components } from '@shared/api/schema'
type SeniorCreate = components['schemas']['SeniorCreate']
type SeniorUpdate = components['schemas']['SeniorUpdate']

export async function createSenior(payload: SeniorCreate): Promise<{ ok: boolean; error?: string }>
export async function updateSenior(id: number, payload: SeniorUpdate): Promise<{ ok: boolean; error?: string }>
export async function deleteSenior(id: number): Promise<{ ok: boolean; error?: string }>
```

### 6.3 `schedules.ts`

```typescript
import type { components } from '@shared/api/schema'
type ScheduleCreate = components['schemas']['ScheduleCreate']
type ScheduleUpdate = components['schemas']['ScheduleUpdate']

export async function createSchedule(payload: ScheduleCreate): Promise<{ ok: boolean; error?: string }>
export async function updateSchedule(id: number, payload: ScheduleUpdate): Promise<{ ok: boolean; error?: string }>
export async function deleteSchedule(id: number): Promise<{ ok: boolean; error?: string }>
```

---

## 7. UI 컴포넌트 설계

### 7.1 `UserTable.tsx`

```typescript
'use client'
// Design Ref: §7.1 — 비활성화 전용 (읽기 + 단일 액션)
// Plan SC: SC-02, SC-03
interface Props {
  users: UserResponse[]
}
```

**내부 상태:**
```typescript
const [pendingIds, setPendingIds] = useState<Set<number>>(new Set())
const router = useRouter()
```

**비활성화 핸들러:**
```typescript
async function handleDeactivate(userId: number) {
  setPendingIds(prev => new Set(prev).add(userId))
  const result = await deactivateUser(userId)
  setPendingIds(prev => { const s = new Set(prev); s.delete(userId); return s })
  if (result.ok) router.refresh()
}
```

**렌더링:** `is_active === true`인 행에만 "비활성화" 버튼 표시. `is_active === false`는 비활성화 뱃지.

---

### 7.2 `SeniorTable.tsx`

```typescript
'use client'
// Design Ref: §7.2 — 인라인 수정: editingId로 행 제어
// Plan SC: SC-04, SC-05, SC-06
interface Props {
  seniors: SeniorResponse[]
}
```

**내부 상태:**
```typescript
const [editingId, setEditingId]   = useState<number | null>(null)
const [showAddForm, setShowAddForm] = useState(false)
const [pendingId, setPendingId]   = useState<number | null>(null)
const [error, setError]           = useState<string | null>(null)
const router = useRouter()
```

**수정 흐름:** "수정" 버튼 → `setEditingId(id)` → 행이 input 필드로 교체 → "저장" 클릭 → `updateSenior()` → `router.refresh()` → `setEditingId(null)`

**삭제 흐름:** `window.confirm()` → `deleteSenior()` → `router.refresh()`

**등록 흐름:** "어르신 등록" 버튼 → `setShowAddForm(true)` → 하단 폼 → `createSenior()` → `router.refresh()` → `setShowAddForm(false)`

**필수 입력 필드 (SeniorCreate):** `full_name`, `birth_date`, `gender`
**선택 입력 필드:** `address`, `phone`, `medical_notes`

---

### 7.3 `ScheduleTable.tsx`

```typescript
'use client'
// Design Ref: §7.3 — 가장 복잡한 컴포넌트: 드롭다운 + 인라인 CRUD
// Plan SC: SC-07, SC-08, SC-09
interface Props {
  schedules: ScheduleResponse[]
  seniors: SeniorResponse[]    // 드롭다운용 (senior select)
  caregivers: UserResponse[]   // 드롭다운용 (caregiver select, role=caregiver)
}
```

**내부 상태:**
```typescript
const [editingId, setEditingId]     = useState<number | null>(null)
const [showCreateForm, setShowCreateForm] = useState(false)
const [pendingId, setPendingId]     = useState<number | null>(null)
const [error, setError]             = useState<string | null>(null)
const router = useRouter()
```

**생성 폼 필드 (ScheduleCreate):**
```typescript
// 필수
senior_id: number      ← <select> seniors 목록
caregiver_id: number   ← <select> caregivers 목록
scheduled_date: string ← <input type="date">
start_time: string     ← <input type="time">
end_time: string       ← <input type="time">
// 선택
notes?: string         ← <input type="text">
```

**수정 폼 필드 (ScheduleUpdate):**
```typescript
// 모두 선택 (nullable)
scheduled_date?: string | null
start_time?: string | null
end_time?: string | null
caregiver_id?: number | null
notes?: string | null
```

> senior_id 변경은 ScheduleUpdate에 없음 (백엔드 스키마 제약).

**삭제:** `window.confirm()` → `deleteSchedule()` → `router.refresh()`

---

## 8. Page 설계

```typescript
// app/admin/page.tsx (Server Component)
// Design Ref: §8 — Promise.all 초기 로드 + caregivers 필터
// Plan SC: SC-01
import { fetchSeniors } from '@entities/senior'
import {
  fetchAdminUsers,
  fetchAllSchedules,
  UserTable,
  SeniorTable,
  ScheduleTable,
} from '@features/admin-dashboard'

export default async function AdminPage() {
  const [users, seniors, schedules] = await Promise.all([
    fetchAdminUsers(),
    fetchSeniors(),           // entities/senior 재사용
    fetchAllSchedules(),
  ])

  // Plan Known Constraint: ScheduleCreate에 caregiver_id 필수 → 활성 caregiver 사전 필터
  const caregivers = users.filter(u => u.role === 'caregiver' && u.is_active)

  return (
    <main className="mx-auto max-w-5xl space-y-10 p-6">
      <h1 className="text-2xl font-bold text-gray-900">관리자 대시보드</h1>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-800">사용자 관리</h2>
        <UserTable users={users} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-800">어르신 관리</h2>
        <SeniorTable seniors={seniors} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-800">일정 관리</h2>
        <ScheduleTable
          schedules={schedules}
          seniors={seniors}
          caregivers={caregivers}
        />
      </section>
    </main>
  )
}
```

---

## 9. FSD Import 확인

```
app/admin/page.tsx
  → @entities/senior              ✅ (app → entities)
  → @features/admin-dashboard     ✅ (app → features)

app/api/admin/.../route.ts
  → @shared/api/server            ✅ (Route Handler → shared)

app/api/seniors/route.ts
  → @shared/api/server            ✅

app/api/schedules/route.ts
  → @shared/api/server            ✅

features/admin-dashboard/api/fetchAdminUsers.ts
  → @shared/api/server            ✅ (features → shared)
  → @shared/api/schema            ✅

features/admin-dashboard/api/deactivateUser.ts
  → (브라우저 fetch, 서버 의존성 없음) ✅

features/admin-dashboard/ui/*.tsx
  → features/admin-dashboard/api  ✅ (동일 slice 내부)
```

---

## 10. 구현 순서 (Implementation Guide)

### 10.1 Module Map

| Module | 파일 | 의존성 |
|--------|------|--------|
| M1: Route Handlers | `app/api/admin/.../route.ts`, `app/api/seniors/route.ts`, `app/api/seniors/[id]/route.ts`, `app/api/schedules/route.ts`, `app/api/schedules/[id]/route.ts` | shared/api/server |
| M2: Server Helpers | `features/admin-dashboard/api/fetchAdminUsers.ts`, `fetchAllSchedules.ts` | shared/api/server, schema |
| M3: Client Helpers | `features/admin-dashboard/api/deactivateUser.ts`, `seniors.ts`, `schedules.ts` | schema |
| M4: Feature index | `features/admin-dashboard/index.ts` | M2, M3 |
| M5: UI Components | `features/admin-dashboard/ui/UserTable.tsx`, `SeniorTable.tsx`, `ScheduleTable.tsx` | M3 |
| M6: App 라우트 | `app/admin/page.tsx` (수정), `loading.tsx`, `error.tsx` | M2, M4, M5, entities/senior |

### 10.2 구현 순서

```
1. M1: Route Handlers (5개 — 백엔드 프록시, 독립)
2. M2: Server Helpers (2개 — fetchAdminUsers, fetchAllSchedules)
3. M3: Client Helpers (3개 — deactivateUser, seniors, schedules)
4. M4: index.ts (public API 정리)
5. M5: UI Components (3개 — UserTable → SeniorTable → ScheduleTable)
6. M6: app/admin/ (page, loading, error)
```

### 10.3 Session Guide

**권장: 2세션 분리** (총 17파일, 약 500줄 예상)

```
Session 1: M1 + M2 + M3 + M4  (인프라 레이어)
  /pdca do admin-dashboard --scope M1,M2,M3,M4

Session 2: M5 + M6             (UI + 라우트)
  /pdca do admin-dashboard --scope M5,M6
```

또는 단일 세션:
```
/pdca do admin-dashboard
```

---

## 11. Success Criteria 매핑

| SC | 구현 위치 |
|----|----------|
| SC-01 목록 렌더링 | `app/admin/page.tsx` |
| SC-02 사용자 테이블 | `UserTable.tsx` |
| SC-03 사용자 비활성화 | `UserTable.tsx` + `deactivateUser.ts` + `/api/admin/users/[id]/deactivate` |
| SC-04 어르신 등록 | `SeniorTable.tsx` + `createSenior` + `/api/seniors/route.ts` |
| SC-05 어르신 수정 | `SeniorTable.tsx` + `updateSenior` + `/api/seniors/[id]/route.ts` PUT |
| SC-06 어르신 삭제 | `SeniorTable.tsx` + `deleteSenior` + `/api/seniors/[id]/route.ts` DELETE |
| SC-07 일정 생성 | `ScheduleTable.tsx` + `createSchedule` + `/api/schedules/route.ts` |
| SC-08 일정 수정 | `ScheduleTable.tsx` + `updateSchedule` + `/api/schedules/[id]/route.ts` PUT |
| SC-09 일정 삭제 | `ScheduleTable.tsx` + `deleteSchedule` + `/api/schedules/[id]/route.ts` DELETE |
| SC-10 Authorization 헤더 | Route Handler `getServerApiHeaders()` (전체) |
| SC-11 미인증 차단 | `proxy.ts` (기존) |

---

## 12. 리스크 대응

| 리스크 | 대응 |
|--------|------|
| ScheduleTable 수정/삭제 동시 | `editingId`로 수정 중 행 제어, 수정 중일 때 삭제 버튼 비활성화 |
| 어르신 삭제 시 연관 일정 에러 | Route Handler에서 `detail` 메시지 그대로 전달 → `setError(result.error)` 표시 |
| 삭제/변경 후 UI 지연 | `router.refresh()` 호출 전 `pendingId`로 버튼 disabled |
