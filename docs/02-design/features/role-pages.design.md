# [Design] role-pages

**작성일**: 2026-10-05
**상태**: Design 완료
**선택 아키텍처**: Option B — 각 Feature에 Chart 컴포넌트 추가

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 9개 메뉴 링크 404 + 대시보드에 그래프 없음 |
| **WHO** | 로그인한 guardian/caregiver/admin 사용자 |
| **RISK** | Recharts SSR 이슈 → "use client" 필수. FastAPI 미연결 → guardian 차트는 mock 데이터 |
| **SUCCESS** | 9개 서브 페이지 접근 가능, 3개 대시보드에 그래프 표시, tsc 통과 |
| **SCOPE** | features/{guardian,caregiver,admin}-dashboard에 Chart 추가 + 서브 9개 page.tsx + 대시보드 3개 수정 |

---

## 1. Overview

**선택: Option B — Feature에 Chart 컴포넌트 추가**

```
features/guardian-dashboard/
  ui/GuardianHealthChart.tsx   ← 신규 (LineChart, "use client")

features/caregiver-dashboard/
  ui/CaregiverScheduleChart.tsx ← 신규 (BarChart, "use client")

features/admin-dashboard/
  ui/AdminUserChart.tsx         ← 신규 (PieChart, "use client")

app/
  guardian/page.tsx             ← 수정: Chart + 어르신 요약
  guardian/records/page.tsx     ← 신규
  guardian/schedules/page.tsx   ← 신규
  guardian/caregivers/page.tsx  ← 신규

  caregiver/page.tsx            ← 수정: Chart + 일정 요약
  caregiver/schedules/page.tsx  ← 신규
  caregiver/records/page.tsx    ← 신규
  caregiver/seniors/page.tsx    ← 신규

  admin/page.tsx                ← 수정: Chart + 요약 카드
  admin/users/page.tsx          ← 신규
  admin/schedules/page.tsx      ← 신규
  admin/seniors/page.tsx        ← 신규
```

**FSD 레이어 흐름:**
```
app/(pages)
  ↓
features/{role}-dashboard  (Chart + fetch + UI 컴포넌트)
  ↓
entities/senior            (SeniorResponse, fetchSeniors)
  ↓
shared/api                 (SERVER_API_URL, getServerApiHeaders)
```

---

## 2. 의존성 설치

```bash
pnpm add recharts
```

Recharts는 Client Component 전용. 모든 Chart 컴포넌트에 `"use client"` 필수.

---

## 3. Chart 컴포넌트 설계

### 3.1 `src/features/guardian-dashboard/ui/GuardianHealthChart.tsx` — 신규

**역할**: 건강지표 추이 LineChart (mock 데이터, 백엔드 연동 전)

```typescript
"use client"
// Design Ref: §3.1 — guardian 건강지표 추이 LineChart (mock)
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts"

const HEALTH_TREND_DATA = [
  { date: "09/29", systolic: 128, diastolic: 82 },
  { date: "09/30", systolic: 132, diastolic: 85 },
  { date: "10/01", systolic: 125, diastolic: 80 },
  { date: "10/02", systolic: 130, diastolic: 83 },
  { date: "10/03", systolic: 127, diastolic: 81 },
  { date: "10/04", systolic: 122, diastolic: 78 },
  { date: "10/05", systolic: 124, diastolic: 79 },
]

export function GuardianHealthChart() {
  return (
    <div className="rounded-lg border bg-white p-4">
      <h2 className="mb-4 text-base font-semibold text-gray-800">건강지표 추이 (최근 7일)</h2>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={HEALTH_TREND_DATA}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis domain={[60, 160]} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="systolic" name="수축기" stroke="#3b82f6" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="diastolic" name="이완기" stroke="#10b981" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

### 3.2 `src/features/caregiver-dashboard/ui/CaregiverScheduleChart.tsx` — 신규

**역할**: 방문 상태별 현황 BarChart (실제 schedules 데이터 집계)

```typescript
"use client"
// Design Ref: §3.2 — caregiver 방문 현황 BarChart
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface Props {
  scheduled: number
  completed: number
  cancelled: number
}

export function CaregiverScheduleChart({ scheduled, completed, cancelled }: Props) {
  const data = [
    { status: "예정", count: scheduled, fill: "#3b82f6" },
    { status: "완료", count: completed, fill: "#10b981" },
    { status: "취소", count: cancelled, fill: "#ef4444" },
  ]

  return (
    <div className="rounded-lg border bg-white p-4">
      <h2 className="mb-4 text-base font-semibold text-gray-800">방문 일정 현황</h2>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="status" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="count" name="건수">
            {data.map((entry, index) => (
              <rect key={index} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

> 참고: recharts의 Bar에서 각 셀 색상을 다르게 하려면 `<Cell>` 컴포넌트 사용

**수정된 구현:**
```typescript
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
// ...
<Bar dataKey="count" name="건수">
  {data.map((entry) => (
    <Cell key={entry.status} fill={entry.fill} />
  ))}
</Bar>
```

### 3.3 `src/features/admin-dashboard/ui/AdminUserChart.tsx` — 신규

**역할**: 역할별 회원수 PieChart (fetchAdminUsers 결과 집계)

```typescript
"use client"
// Design Ref: §3.3 — admin 역할별 회원수 PieChart
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface Props {
  guardian: number
  caregiver: number
  admin: number
}

const COLORS = { guardian: "#3b82f6", caregiver: "#10b981", admin: "#f59e0b" }

export function AdminUserChart({ guardian, caregiver, admin }: Props) {
  const data = [
    { name: "보호자", value: guardian },
    { name: "케어기버", value: caregiver },
    { name: "관리자", value: admin },
  ]

  return (
    <div className="rounded-lg border bg-white p-4">
      <h2 className="mb-4 text-base font-semibold text-gray-800">역할별 회원 현황</h2>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
            {data.map((entry) => (
              <Cell key={entry.name} fill={COLORS[entry.name === "보호자" ? "guardian" : entry.name === "케어기버" ? "caregiver" : "admin"]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
```

---

## 4. index.ts 수정 — Chart export 추가

### 4.1 `src/features/guardian-dashboard/index.ts`

기존 export에 추가:
```typescript
export { GuardianHealthChart } from "./ui/GuardianHealthChart"
```

### 4.2 `src/features/caregiver-dashboard/index.ts`

기존 export에 추가:
```typescript
export { CaregiverScheduleChart } from "./ui/CaregiverScheduleChart"
```

### 4.3 `src/features/admin-dashboard/index.ts`

기존 export에 추가:
```typescript
export { AdminUserChart } from "./ui/AdminUserChart"
```

---

## 5. 대시보드 페이지 수정

### 5.1 `app/guardian/page.tsx` — 수정

Server Component. GuardianHealthChart는 Client Component이므로 import만 하면 자동 분리됨.

```typescript
// Design Ref: §5.1 — guardian 대시보드: 건강지표 차트 + 어르신 목록
import { fetchSeniors } from "@entities/senior"
import { SeniorCard, GuardianHealthChart } from "@features/guardian-dashboard"

export default async function GuardianPage() {
  const seniors = await fetchSeniors()

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">보호자 대시보드</h1>

      {/* 건강지표 차트 */}
      <GuardianHealthChart />

      {/* 담당 어르신 */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">담당 어르신 ({seniors.length}명)</h2>
        {seniors.length === 0 ? (
          <p className="text-gray-400">담당 어르신이 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {seniors.map((s) => <SeniorCard key={s.id} senior={s} />)}
          </ul>
        )}
      </section>
    </div>
  )
}
```

### 5.2 `app/caregiver/page.tsx` — 수정

schedules 데이터를 집계해서 Chart에 props로 전달.

```typescript
// Design Ref: §5.2 — caregiver 대시보드: 방문 현황 차트 + 오늘 일정 요약
import { fetchCaregiverSchedules, ScheduleCard, CaregiverScheduleChart } from "@features/caregiver-dashboard"
import { fetchSeniors } from "@entities/senior"

export default async function CaregiverPage() {
  const [seniors, schedules] = await Promise.all([fetchSeniors(), fetchCaregiverSchedules()])

  const seniorMap = Object.fromEntries(seniors.map((s) => [s.id, s.full_name]))

  // Plan SC: SC-02 — 상태별 집계
  const stats = {
    scheduled: schedules.filter((s) => s.status === "scheduled").length,
    completed: schedules.filter((s) => s.status === "completed").length,
    cancelled: schedules.filter((s) => s.status === "cancelled").length,
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">케어기버 대시보드</h1>

      <CaregiverScheduleChart {...stats} />

      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">오늘 방문 일정</h2>
        {schedules.length === 0 ? (
          <p className="text-gray-400">오늘 예정된 방문 일정이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {schedules.slice(0, 5).map((s) => (
              <ScheduleCard key={s.id} schedule={s} seniorName={seniorMap[s.senior_id] ?? `어르신 #${s.senior_id}`} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
```

### 5.3 `app/admin/page.tsx` — 수정

UserTable/SeniorTable/ScheduleTable은 서브 페이지로 이동. 대시보드는 차트 + 요약 카드만.

```typescript
// Design Ref: §5.3 — admin 대시보드: 역할별 회원 차트 + 요약 카드
import { fetchAdminUsers, AdminUserChart } from "@features/admin-dashboard"
import { fetchSeniors } from "@entities/senior"
import { fetchAllSchedules } from "@features/admin-dashboard"

export default async function AdminPage() {
  const [users, seniors, schedules] = await Promise.all([
    fetchAdminUsers(), fetchSeniors(), fetchAllSchedules()
  ])

  const chartData = {
    guardian: users.filter((u) => u.role === "guardian").length,
    caregiver: users.filter((u) => u.role === "caregiver").length,
    admin: users.filter((u) => u.role === "admin").length,
  }

  const recentUsers = [...users].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 5)

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">관리자 대시보드</h1>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="전체 회원" value={users.length} />
        <StatCard label="담당 어르신" value={seniors.length} />
        <StatCard label="전체 일정" value={schedules.length} />
      </div>

      {/* 차트 */}
      <AdminUserChart {...chartData} />

      {/* 최근 가입 회원 */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">최근 가입 회원</h2>
        <ul className="divide-y rounded-lg border bg-white">
          {recentUsers.map((u) => (
            <li key={u.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="font-medium text-gray-900">{u.name ?? u.username}</span>
              <span className="text-gray-500">{u.role}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-white p-4 text-center">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  )
}
```

---

## 6. 서브 페이지 설계

### 6.1 Guardian 서브 페이지

#### `app/guardian/records/page.tsx` — 신규

```typescript
// Design Ref: §6.1 — guardian 건강기록 조회
import { fetchSeniors } from "@entities/senior"
import { fetchRecords, VisitRecordList } from "@features/guardian-dashboard"

export default async function GuardianRecordsPage() {
  const seniors = await fetchSeniors()
  // 첫 번째 어르신 기록 표시 (단일 어르신 시나리오)
  const records = seniors.length > 0 ? await fetchRecords(seniors[0].id) : []

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">건강기록 조회</h1>
      {records.length === 0 ? (
        <p className="text-gray-400">건강기록이 없습니다.</p>
      ) : (
        <VisitRecordList records={records} />
      )}
    </div>
  )
}
```

> fetchRecords(seniorId) signature 확인 필요. 없으면 빈 배열 fallback.

#### `app/guardian/schedules/page.tsx` — 신규

```typescript
// Design Ref: §6.2 — guardian 방문일정 목록
import { fetchSeniors } from "@entities/senior"
import { fetchSchedules, ScheduleList } from "@features/guardian-dashboard"

export default async function GuardianSchedulesPage() {
  const seniors = await fetchSeniors()
  const schedules = seniors.length > 0 ? await fetchSchedules(seniors[0].id) : []

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">방문 일정</h1>
      {schedules.length === 0 ? (
        <p className="text-gray-400">방문 일정이 없습니다.</p>
      ) : (
        <ScheduleList schedules={schedules} />
      )}
    </div>
  )
}
```

#### `app/guardian/caregivers/page.tsx` — 신규

```typescript
// Design Ref: §6.3 — guardian 케어기버 목록 (admin API 재활용)
import { fetchAdminUsers } from "@features/admin-dashboard"

export default async function GuardianCaregiversPage() {
  const users = await fetchAdminUsers()
  const caregivers = users.filter((u) => u.role === "caregiver" && u.is_active)

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">케어기버 목록</h1>
      {caregivers.length === 0 ? (
        <p className="text-gray-400">배정된 케어기버가 없습니다.</p>
      ) : (
        <ul className="divide-y rounded-lg border bg-white">
          {caregivers.map((c) => (
            <li key={c.id} className="px-4 py-3">
              <p className="font-medium text-gray-900">{c.name ?? c.username}</p>
              <p className="text-sm text-gray-500">{c.email}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

### 6.2 Caregiver 서브 페이지

#### `app/caregiver/schedules/page.tsx` — 신규

```typescript
// Design Ref: §6.4 — caregiver 방문 일정 목록
import { fetchCaregiverSchedules, ScheduleCard } from "@features/caregiver-dashboard"
import { fetchSeniors } from "@entities/senior"

export default async function CaregiverSchedulesPage() {
  const [seniors, schedules] = await Promise.all([fetchSeniors(), fetchCaregiverSchedules()])
  const seniorMap = Object.fromEntries(seniors.map((s) => [s.id, s.full_name]))

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">방문 일정</h1>
      {schedules.length === 0 ? (
        <p className="text-gray-400">방문 일정이 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {schedules.map((s) => (
            <ScheduleCard key={s.id} schedule={s} seniorName={seniorMap[s.senior_id] ?? `어르신 #${s.senior_id}`} />
          ))}
        </div>
      )}
    </div>
  )
}
```

#### `app/caregiver/records/page.tsx` — 신규

```typescript
// Design Ref: §6.5 — caregiver 건강기록 목록 (Read-only)
import { fetchSeniors } from "@entities/senior"
import { fetchRecords, VisitRecordList } from "@features/guardian-dashboard"

export default async function CaregiverRecordsPage() {
  const seniors = await fetchSeniors()
  const records = seniors.length > 0 ? await fetchRecords(seniors[0].id) : []

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">건강기록</h1>
      <p className="text-sm text-gray-500">건강기록 입력 기능은 추후 업데이트 예정입니다.</p>
      {records.length === 0 ? (
        <p className="text-gray-400">건강기록이 없습니다.</p>
      ) : (
        <VisitRecordList records={records} />
      )}
    </div>
  )
}
```

#### `app/caregiver/seniors/page.tsx` — 신규

```typescript
// Design Ref: §6.6 — caregiver 담당 어르신 목록
import { fetchSeniors } from "@entities/senior"
import { SeniorCard } from "@features/guardian-dashboard"

export default async function CaregiverSeniorsPage() {
  const seniors = await fetchSeniors()

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">담당 어르신 목록</h1>
      {seniors.length === 0 ? (
        <p className="text-gray-400">담당 어르신이 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {seniors.map((s) => <SeniorCard key={s.id} senior={s} />)}
        </ul>
      )}
    </div>
  )
}
```

### 6.3 Admin 서브 페이지

#### `app/admin/users/page.tsx` — 신규

기존 admin/page.tsx에서 UserTable 이동.

```typescript
// Design Ref: §6.7 — admin 회원 관리
import { fetchAdminUsers, UserTable } from "@features/admin-dashboard"

export default async function AdminUsersPage() {
  const users = await fetchAdminUsers()

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">회원 관리</h1>
      <UserTable users={users} />
    </div>
  )
}
```

#### `app/admin/schedules/page.tsx` — 신규

기존 admin/page.tsx에서 ScheduleTable 이동.

```typescript
// Design Ref: §6.8 — admin 일정 관리
import { fetchAdminUsers, fetchAllSchedules, ScheduleTable } from "@features/admin-dashboard"
import { fetchSeniors } from "@entities/senior"

export default async function AdminSchedulesPage() {
  const [users, seniors, schedules] = await Promise.all([
    fetchAdminUsers(), fetchSeniors(), fetchAllSchedules()
  ])
  const caregivers = users.filter((u) => u.role === "caregiver" && u.is_active)

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">일정 관리</h1>
      <ScheduleTable schedules={schedules} seniors={seniors} caregivers={caregivers} />
    </div>
  )
}
```

#### `app/admin/seniors/page.tsx` — 신규

기존 admin/page.tsx에서 SeniorTable 이동.

```typescript
// Design Ref: §6.9 — admin 어르신 관리
import { fetchAdminUsers, SeniorTable } from "@features/admin-dashboard"
import { fetchSeniors } from "@entities/senior"

export default async function AdminSeniorsPage() {
  const seniors = await fetchSeniors()

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">어르신 관리</h1>
      <SeniorTable seniors={seniors} />
    </div>
  )
}
```

---

## 7. 엣지 케이스

| 케이스 | 처리 |
|--------|------|
| API 응답 빈 배열 | 각 페이지에 "데이터 없음" UI (p.text-gray-400) |
| API 실패 (Next.js throw) | 각 route 폴더의 error.tsx가 자동 처리 |
| guardian/records — fetchRecords signature 불일치 | 실제 함수 시그니처 확인 후 조정 |
| admin/page.tsx UserResponse.created_at 없음 | `created_at` 없으면 `id` 기준 정렬로 fallback |
| Recharts hydration mismatch | "use client" 컴포넌트로 분리 → SSR에서 제외 |

---

## 8. 보안 / FSD

- 모든 fetch는 Server Component에서 실행 → 쿠키 포함 서버 헤더 사용
- Chart 컴포넌트만 `"use client"` — 데이터 전달은 props로 (Server→Client)
- `guardian/caregivers` 페이지에서 `fetchAdminUsers()` 사용 → FSD 규칙상 feature 간 직접 import 금지
  - **해결**: guardian-dashboard feature에 `fetchCaregivers` 래퍼 추가 OR app layer에서 직접 admin-dashboard import (app → features 방향이므로 허용)
  - 선택: **app layer에서 admin-dashboard import** — FSD 허용 (top-down)

---

## 11. Implementation Guide

### 11.1 구현 순서

```
M1: 의존성 + Chart 컴포넌트
  1. pnpm add recharts
  2. features/guardian-dashboard/ui/GuardianHealthChart.tsx — 신규
  3. features/caregiver-dashboard/ui/CaregiverScheduleChart.tsx — 신규
  4. features/admin-dashboard/ui/AdminUserChart.tsx — 신규
  5. 각 feature index.ts에 Chart export 추가 (3개)

M2: 대시보드 페이지 수정
  6. app/guardian/page.tsx — 수정
  7. app/caregiver/page.tsx — 수정
  8. app/admin/page.tsx — 수정

M3: Guardian 서브 페이지
  9.  app/guardian/records/page.tsx
  10. app/guardian/schedules/page.tsx
  11. app/guardian/caregivers/page.tsx

M4: Caregiver 서브 페이지
  12. app/caregiver/schedules/page.tsx
  13. app/caregiver/records/page.tsx
  14. app/caregiver/seniors/page.tsx

M5: Admin 서브 페이지
  15. app/admin/users/page.tsx
  16. app/admin/schedules/page.tsx
  17. app/admin/seniors/page.tsx
```

### 11.2 주의사항

- `"use client"` 없이 Recharts import 시 빌드 오류
- `GuardianHealthChart`는 순수 mock 데이터 → props 없음
- `CaregiverScheduleChart`는 Server Component에서 집계 후 props 전달 (서버에서 집계, 클라이언트에서 렌더)
- `AdminUserChart`도 동일 패턴
- `fetchRecords(seniorId)` — guardian-dashboard index.ts에서 확인 필요

### 11.3 Session Guide

| 모듈 | 파일 수 | 예상 라인 | 범위 |
|------|---------|----------|------|
| M1 | 3 Chart + 3 index.ts 수정 | ~120줄 | Chart 컴포넌트 |
| M2 | 3 page.tsx 수정 | ~80줄 | 대시보드 리디자인 |
| M3 | 3 page.tsx 신규 | ~60줄 | Guardian 서브 |
| M4 | 3 page.tsx 신규 | ~60줄 | Caregiver 서브 |
| M5 | 3 page.tsx 신규 | ~60줄 | Admin 서브 |

**권장**: M1+M2 먼저 → 그래프 동작 확인 → M3~M5 순차 진행
**전체 예상**: ~380줄, 2세션 권장 (M1+M2 / M3~M5)
