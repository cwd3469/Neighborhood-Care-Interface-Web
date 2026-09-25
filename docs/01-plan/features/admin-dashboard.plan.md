# [Plan] admin-dashboard

> 관리자 대시보드 — 사용자·어르신·일정 Full CRUD 관리

**작성일**: 2026-09-23
**상태**: Plan 완료

---

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | admin-dashboard |
| **Milestone** | 4 — 프론트 대시보드 3종 연동 (세 번째) |
| **관련 엔드포인트** | GET /admin/users, PATCH /admin/users/{id}/deactivate, POST/PUT/DELETE /seniors, GET/POST/PUT/DELETE /schedules |

### Value Delivered (4 Perspectives)

| 관점 | 내용 |
|------|------|
| **Problem** | 관리자가 사용자 계정·어르신 정보·방문 일정을 한 화면에서 직접 관리할 수 없음 |
| **Solution** | 단일 `/admin` 페이지 — 3개 섹션(사용자/어르신/일정) Full CRUD, Route Handler 프록시 패턴 재사용 |
| **Function UX Effect** | 사용자 비활성화·어르신 인라인 등록/수정/삭제·일정 생성(드롭다운) — 모든 쓰기 작업 인라인 처리 |
| **Core Value** | guardian(읽기) + caregiver(제한 쓰기)에 이어 admin(Full CRUD) — 3종 대시보드 패턴 완성, 역할별 권한 설계 면접 어필 |

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | Milestone 4 세 번째 — 관리자가 전체 데이터를 직접 관리해야 서비스 운영 가능 |
| **WHO** | 프론트 5년차 — guardian/caregiver 패턴 확립, Route Handler 프록시 숙지 |
| **RISK** | Full CRUD 파일 수 증가 (~17개), 일정 생성 폼 드롭다운 (senior/caregiver 사전 로드) |
| **SUCCESS** | `/admin` → 사용자 비활성화·어르신 CRUD·일정 CRUD 모두 작동 |
| **SCOPE** | 단일 페이지 `/admin` — 3섹션 Full CRUD, 사용자 생성 제외 (API 없음) |

---

## 1. 요구사항

### 1.1 기능 요구사항

| # | 요구사항 | 우선순위 |
|---|----------|----------|
| R-01 | `/admin` 진입 시 사용자·어르신·일정 목록 표시 | Must |
| R-02 | 사용자 테이블: username, role, full_name, is_active 표시 | Must |
| R-03 | 활성 사용자에 "비활성화" 버튼 → PATCH /admin/users/{id}/deactivate | Must |
| R-04 | 어르신 목록 + 인라인 등록 폼 → POST /seniors | Must |
| R-05 | 어르신 행 수정 폼 (인라인) → PUT /seniors/{id} | Must |
| R-06 | 어르신 삭제 버튼 + 확인 → DELETE /seniors/{id} | Must |
| R-07 | 일정 목록 (전체) + 인라인 생성 폼 → POST /schedules | Must |
| R-08 | 생성 폼: senior select + caregiver select (드롭다운) + 날짜/시간 | Must |
| R-09 | 일정 수정 (인라인) → PUT /schedules/{id} | Must |
| R-10 | 일정 삭제 → DELETE /schedules/{id} | Must |
| R-11 | 모든 쓰기 API `Authorization: Bearer {token}` 헤더 | Must |

### 1.2 비기능 요구사항

| # | 요구사항 |
|---|----------|
| NF-01 | 초기 데이터(users + seniors + schedules)는 Server Component에서 fetch |
| NF-02 | 모든 쓰기 폼은 Client Component ('use client') |
| NF-03 | Route Handler에서 `getServerApiHeaders()` 사용해 FastAPI 인증 프록시 |
| NF-04 | 로딩: `loading.tsx` skeleton / 에러: `error.tsx` |

### 1.3 Known Constraints

| 제약 | 대응 |
|------|------|
| 사용자 생성 API 없음 | `POST /register`는 admin 전용 아님 → 비활성화만 지원 |
| 일정 생성에 senior_id, caregiver_id 필수 | Server Component에서 users 사전 로드, role=caregiver 필터 → 드롭다운 |
| schedules에 caregiver_name 없음 | caregiver_id 표시 (caregiver-dashboard와 동일 제약) |

---

## 2. API 매핑

| 기능 | 엔드포인트 | 방향 |
|------|-----------|------|
| 사용자 목록 | `GET /admin/users` | Server Component |
| 사용자 비활성화 | `PATCH /api/admin/users/{id}/deactivate` | Client → Route Handler → FastAPI |
| 어르신 목록 | `GET /seniors` | Server Component (entities/senior 재사용) |
| 어르신 등록 | `POST /api/seniors` | Client → Route Handler → FastAPI |
| 어르신 수정 | `PUT /api/seniors/{id}` | Client → Route Handler → FastAPI |
| 어르신 삭제 | `DELETE /api/seniors/{id}` | Client → Route Handler → FastAPI |
| 일정 목록 | `GET /schedules` | Server Component |
| 일정 생성 | `POST /api/schedules` | Client → Route Handler → FastAPI |
| 일정 수정 | `PUT /api/schedules/{id}` | Client → Route Handler → FastAPI |
| 일정 삭제 | `DELETE /api/schedules/{id}` | Client → Route Handler → FastAPI |

---

## 3. 화면 구조

```
/admin                               ← 단일 페이지

  [Server Component] 초기 데이터 fetch
    ├─ 사용자 관리 섹션
    │    └─ UserTable                ← [Client Component]
    │         ├─ id, username, role, full_name, is_active 컬럼
    │         └─ 활성 사용자 → "비활성화" 버튼
    │
    ├─ 어르신 관리 섹션
    │    └─ SeniorTable              ← [Client Component]
    │         ├─ 목록 (full_name, birth_date, gender)
    │         ├─ 행마다 "수정" → 인라인 수정 폼
    │         ├─ 행마다 "삭제" → confirm 후 DELETE
    │         └─ 하단 "어르신 등록" 인라인 폼
    │
    └─ 일정 관리 섹션
         └─ ScheduleTable            ← [Client Component]
              ├─ 목록 (senior_id, caregiver_id, date, time, status)
              ├─ 행마다 "수정" → 인라인 수정 폼
              ├─ 행마다 "삭제"
              └─ "일정 생성" 인라인 폼 (senior select + caregiver select + 날짜/시간)
```

---

## 4. 라우트 및 파일 계획

```
app/
  api/
    admin/
      users/
        [userId]/
          deactivate/
            route.ts               ← PATCH 프록시 (신규)
    seniors/
      route.ts                     ← POST 프록시 (신규)
      [seniorId]/
        route.ts                   ← PUT + DELETE 프록시 (신규)
    schedules/
      route.ts                     ← POST 프록시 (신규)
      [scheduleId]/
        route.ts                   ← PUT + DELETE 프록시 (신규)
        status/
          route.ts                 ← 기존 (caregiver-dashboard)
  admin/
    page.tsx                       ← Server Component (수정)
    loading.tsx                    ← skeleton (신규)
    error.tsx                      ← 'use client' (신규)

src/
  features/admin-dashboard/
    api/
      fetchAdminUsers.ts           ← Server fetch helper (신규)
      fetchAllSchedules.ts         ← Server fetch helper (신규)
      deactivateUser.ts            ← Client helper (신규)
      seniors.ts                   ← createSenior, updateSenior, deleteSenior (신규)
      schedules.ts                 ← createSchedule, updateSchedule, deleteSchedule (신규)
    ui/
      UserTable.tsx                ← 'use client' (신규)
      SeniorTable.tsx              ← 'use client' 인라인 CRUD (신규)
      ScheduleTable.tsx            ← 'use client' 드롭다운 + 인라인 CRUD (신규)
    index.ts                       ← public API (신규)
```

**신규 파일**: 16개 / **수정 파일**: 1개 (`app/admin/page.tsx`)

---

## 5. Route Handler 설계

### 5.1 `app/api/admin/users/[userId]/deactivate/route.ts`
```typescript
export async function PATCH(req, { params }) {
  const { userId } = await params
  const res = await fetch(`${SERVER_API_URL}/admin/users/${userId}/deactivate`, {
    method: 'PATCH',
    headers: await getServerApiHeaders(),
  })
  // ...
}
```

### 5.2 `app/api/seniors/route.ts`
```typescript
export async function POST(req) {
  const body = await req.json()  // SeniorCreate
  const res = await fetch(`${SERVER_API_URL}/seniors`, {
    method: 'POST',
    headers: await getServerApiHeaders(),
    body: JSON.stringify(body),
  })
  // ...
}
```

### 5.3 `app/api/seniors/[seniorId]/route.ts`
```typescript
export async function PUT(req, { params }) { /* PUT /seniors/{id} */ }
export async function DELETE(req, { params }) { /* DELETE /seniors/{id} */ }
```

### 5.4 `app/api/schedules/route.ts`
```typescript
export async function POST(req) { /* POST /schedules — ScheduleCreate */ }
```

### 5.5 `app/api/schedules/[scheduleId]/route.ts`
```typescript
export async function PUT(req, { params }) { /* PUT /schedules/{id} */ }
export async function DELETE(req, { params }) { /* DELETE /schedules/{id} */ }
```

---

## 6. Page 설계

```typescript
// app/admin/page.tsx (Server Component)
export default async function AdminPage() {
  const [users, seniors, schedules] = await Promise.all([
    fetchAdminUsers(),
    fetchSeniors(),       // entities/senior 재사용
    fetchAllSchedules(),
  ])
  const caregivers = users.filter(u => u.role === 'caregiver' && u.is_active)

  return (
    <main>
      <UserTable users={users} />
      <SeniorTable seniors={seniors} />
      <ScheduleTable
        schedules={schedules}
        seniors={seniors}          // 드롭다운용
        caregivers={caregivers}    // 드롭다운용
      />
    </main>
  )
}
```

---

## 7. Success Criteria

| # | 기준 | 검증 방법 |
|---|------|----------|
| SC-01 | `/admin` 사용자·어르신·일정 목록 렌더링 | 화면 확인 |
| SC-02 | 사용자 테이블 role/is_active 표시 | 화면 확인 |
| SC-03 | 사용자 비활성화 버튼 → PATCH → UI 갱신 | 클릭 확인 |
| SC-04 | 어르신 등록 인라인 폼 → POST → 목록 갱신 | 폼 제출 |
| SC-05 | 어르신 수정 인라인 폼 → PUT → 갱신 | 수정 버튼 |
| SC-06 | 어르신 삭제 → DELETE → 목록에서 제거 | 삭제 버튼 |
| SC-07 | 일정 생성 폼 (드롭다운) → POST → 목록 갱신 | 폼 제출 |
| SC-08 | 일정 수정 → PUT → 갱신 | 수정 버튼 |
| SC-09 | 일정 삭제 → DELETE | 삭제 버튼 |
| SC-10 | Authorization 헤더 전송 | Network 확인 |
| SC-11 | 미인증 차단 | 직접 URL 접근 |

---

## 8. 리스크

| # | 리스크 | 심각도 | 대응 |
|---|--------|--------|------|
| R-01 | ScheduleTable 복잡도 — 드롭다운 + 수정/삭제 동시 | Medium | 수정 중 행 ID로 상태 관리 |
| R-02 | 삭제 후 `router.refresh()` 지연 | Low | pending 중 버튼 disabled |
| R-03 | 어르신 삭제 시 연관 일정 있을 경우 BE에서 에러 | Medium | error 메시지 표시 |

---

## 9. 다음 단계

- `/pdca design admin-dashboard`
