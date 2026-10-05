# [Design] admin-user-tabs

> 관리자 회원 관리 페이지 역할별 탭 분리 + 보호자/요양사 등록 모달 — Option B (Feature Slice 분리)

**작성일**: 2026-10-05
**상태**: Design 완료
**선택 아키텍처**: Option B — Feature Slice 분리

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 관리자가 직접 보호자·요양사 계정을 생성·관리. 자가 가입 없이 검증된 사용자만 시스템 진입 |
| **WHO** | admin 역할 사용자 |
| **RISK** | FastAPI 파일 업로드 미지원 → 파일 필드는 UI만 구현. admin create user API 없으면 mock 201 응답 |
| **SUCCESS** | 탭 전환 동작, 모달 폼 제출 성공, tsc 통과 |
| **SCOPE** | admin/users 페이지 수정 + 탭 컴포넌트 + 등록 모달 2종. Create + 기존 Read/Deactivate 유지 |

---

## 1. Architecture Overview (Option B)

`app/admin/users/page.tsx` 는 **Server Component** 유지 — `fetchAdminUsers()` 호출 후 `users` 배열을 `UserTabs`에 props로 전달.

`UserTabs` 는 **Client Component** — 탭 상태, 모달 개폐 상태 관리. 역할 필터링 후 기존 `UserTable` 재사용.

```
app/admin/users/page.tsx      (Server Component — 데이터 패칭)
  └── <UserTabs users={users} />   (Client Component — 탭/모달 조율)
        ├── [보호자 탭] → <UserTable users={guardians} />
        │     └── <GuardianRegisterModal />
        └── [요양사 탭] → <UserTable users={caregivers} />
              └── <CaregiverRegisterModal />
```

---

## 2. 데이터 흐름

```
Server Component (page.tsx)
  fetchAdminUsers() → UserResponse[]
    ↓ props
  UserTabs (Client)
    tab === "guardian" → users.filter(u => u.role === "guardian")
    tab === "caregiver" → users.filter(u => u.role === "caregiver")
    ↓
  UserTable (기존 Client Component — 재사용)

  모달 제출 흐름:
  GuardianRegisterModal / CaregiverRegisterModal
    react-hook-form.handleSubmit
    → createUser({ role, ...formData })
    → POST /api/admin/users  (Next.js Route Handler)
    → mock 201 (FastAPI 연결 전)
    → onSuccess: router.refresh() + 모달 닫기
```

---

## 3. 타입 정의

### 3.1 CreateUserRequest

```typescript
// src/features/admin-dashboard/api/createUser.ts

export type CreateUserRole = "guardian" | "caregiver";

interface BaseUserFields {
  role: CreateUserRole;
  username: string;
  password: string;
  full_name: string;
  phone?: string;
}

interface GuardianFields {
  role: "guardian";
  relationship: "자녀" | "배우자" | "형제/자매" | "부모" | "기타";
  address?: string;
  emergency_contact?: string;
  // family_certificate: File — UI only, not sent until FastAPI supports multipart
}

interface CaregiverFields {
  role: "caregiver";
  license_number: string;
  experience_years?: number;
  // certificate: File — UI only
}

export type CreateUserRequest =
  | (BaseUserFields & GuardianFields)
  | (BaseUserFields & CaregiverFields);
```

### 3.2 폼 타입 (react-hook-form용)

```typescript
// GuardianRegisterModal 내부
interface GuardianFormValues {
  full_name: string;
  username: string;
  password: string;
  phone?: string;
  relationship: "자녀" | "배우자" | "형제/자매" | "부모" | "기타";
  address?: string;
  emergency_contact?: string;
  family_certificate?: FileList;  // UI only
}

// CaregiverRegisterModal 내부
interface CaregiverFormValues {
  full_name: string;
  username: string;
  password: string;
  phone?: string;
  license_number: string;
  experience_years?: number;
  certificate?: FileList;  // UI only
}
```

---

## 4. 컴포넌트 설계

### 4.1 UserTabs

```typescript
// src/features/admin-dashboard/ui/UserTabs.tsx
"use client";

type Tab = "guardian" | "caregiver";

interface Props {
  users: UserResponse[];
}

export function UserTabs({ users }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("guardian");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filtered = users.filter((u) => u.role === activeTab);

  return (
    <div>
      {/* 탭 헤더 */}
      <div className="flex items-center justify-between border-b border-gray-200">
        <div className="flex gap-0">
          {(["guardian", "caregiver"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setIsModalOpen(false); }}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px",
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              {tab === "guardian" ? "보호자" : "요양사"}
            </button>
          ))}
        </div>
        <button onClick={() => setIsModalOpen(true)} className="...">
          + {activeTab === "guardian" ? "보호자" : "요양사"} 등록
        </button>
      </div>

      {/* 목록 */}
      {filtered.length === 0 ? (
        <EmptyState role={activeTab} />
      ) : (
        <UserTable users={filtered} />
      )}

      {/* 모달 */}
      {activeTab === "guardian" && (
        <GuardianRegisterModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
      {activeTab === "caregiver" && (
        <CaregiverRegisterModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
```

**EmptyState**: `"등록된 보호자가 없습니다"` / `"등록된 요양사가 없습니다"` 텍스트 표시.

### 4.2 GuardianRegisterModal

```typescript
// src/features/admin-dashboard/ui/GuardianRegisterModal.tsx
"use client";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function GuardianRegisterModal({ open, onClose }: Props) {
  const router = useRouter();
  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<GuardianFormValues>();

  const mutation = useMutation({
    mutationFn: (data: GuardianFormValues) =>
      createUser({
        role: "guardian",
        username: data.username,
        password: data.password,
        full_name: data.full_name,
        phone: data.phone,
        relationship: data.relationship,
        address: data.address,
        emergency_contact: data.emergency_contact,
      }),
    onSuccess: () => {
      router.refresh();
      reset();
      onClose();
    },
  });

  if (!open) return null;

  return (
    <dialog open className="modal-overlay">
      <div className="modal-panel">
        <h2>보호자 등록</h2>
        <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
          {/* 공통 필드 */}
          <Field label="이름" error={errors.full_name}>
            <input {...register("full_name", { required: "이름을 입력하세요." })} />
          </Field>
          <Field label="아이디" error={errors.username}>
            <input {...register("username", { required: "아이디를 입력하세요." })} />
          </Field>
          <Field label="비밀번호" error={errors.password}>
            <input type="password" {...register("password", { required: "비밀번호를 입력하세요.", minLength: { value: 8, message: "8자 이상 입력하세요." } })} />
          </Field>
          <Field label="전화번호">
            <input type="tel" {...register("phone")} />
          </Field>

          {/* 보호자 전용 필드 */}
          <Field label="피보호자와의 관계" error={errors.relationship}>
            <select {...register("relationship", { required: "관계를 선택하세요." })}>
              <option value="">선택</option>
              {["자녀", "배우자", "형제/자매", "부모", "기타"].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="주소">
            <input {...register("address")} />
          </Field>
          <Field label="비상연락처">
            <input type="tel" {...register("emergency_contact")} />
          </Field>
          <Field label="가족관계증명서">
            <input type="file" {...register("family_certificate")} />
          </Field>

          {mutation.error && (
            <p role="alert" className="text-sm text-red-600">
              {mutation.error.message}
            </p>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={onClose}>취소</button>
            <button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "등록 중..." : "등록"}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
```

### 4.3 CaregiverRegisterModal

GuardianRegisterModal과 동일한 구조. 전용 필드만 다름:

```typescript
{/* 요양사 전용 필드 */}
<Field label="요양사 면허번호" error={errors.license_number}>
  <input {...register("license_number", { required: "면허번호를 입력하세요." })} />
</Field>
<Field label="경력 연수">
  <input type="number" min={0} {...register("experience_years", { valueAsNumber: true })} />
</Field>
<Field label="자격증 파일">
  <input type="file" {...register("certificate")} />
</Field>
```

`mutationFn`: `createUser({ role: "caregiver", ..., license_number, experience_years })`

---

## 5. API 설계

### 5.1 createUser (Client API)

```typescript
// src/features/admin-dashboard/api/createUser.ts
// Design Ref: §5.1 — POST /api/admin/users 호출

export async function createUser(body: CreateUserRequest): Promise<void> {
  const res = await fetch("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail ?? "사용자 등록에 실패했습니다.");
  }
}
```

### 5.2 Next.js Route Handler (mock)

```typescript
// app/api/admin/users/route.ts
// Design Ref: §5.2 — FastAPI 연결 전 mock 201 응답

import { NextResponse } from "next/server";

export async function POST() {
  // TODO: FastAPI 연결 시 실제 로직으로 교체
  // POST ${BACKEND_URL}/admin/users with body + auth headers
  return NextResponse.json({ message: "사용자가 등록되었습니다." }, { status: 201 });
}
```

> **FastAPI 연결 시**: `getServerApiHeaders()` + `SERVER_API_URL` 사용하여 프록시 방식으로 교체

---

## 6. page.tsx 수정

```typescript
// app/admin/users/page.tsx
// Design Ref: §6 — Server Component, UserTable → UserTabs 교체

import { fetchAdminUsers, UserTabs } from "@features/admin-dashboard";

export default async function AdminUsersPage() {
  const users = await fetchAdminUsers();

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">회원 관리</h1>
      <UserTabs users={users} />
    </main>
  );
}
```

---

## 7. index.ts 수정

```typescript
// src/features/admin-dashboard/index.ts 에 추가

export { UserTabs } from "./ui/UserTabs";
export { createUser } from "./api/createUser";
// GuardianRegisterModal, CaregiverRegisterModal은 UserTabs 내부에서만 사용 → export 불필요
```

---

## 8. UI 스타일 가이드

기존 LoginForm / SignupForm 스타일 일관성 유지:

| 요소 | 클래스 |
|------|--------|
| 입력 필드 | `rounded-md border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500` |
| 등록 버튼 | `rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60` |
| 취소 버튼 | `rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50` |
| 에러 메시지 | `text-sm text-red-600` |
| 활성 탭 | `border-b-2 border-blue-600 text-blue-600` |
| 비활성 탭 | `border-b-2 border-transparent text-gray-500 hover:text-gray-700` |
| 모달 오버레이 | `fixed inset-0 z-50 flex items-center justify-center bg-black/50` |
| 모달 패널 | `w-full max-w-md rounded-lg bg-white p-6 shadow-xl` |

---

## 9. 에러 처리 전략

| 시나리오 | 처리 |
|----------|------|
| 필수 필드 미입력 | react-hook-form validation → 인라인 에러 메시지 |
| API 실패 (4xx/5xx) | `mutation.error.message` → 폼 하단 에러 표시 |
| 등록 성공 | `router.refresh()` → 목록 갱신, 모달 닫기, 폼 reset |
| 빈 목록 | EmptyState 컴포넌트 표시 |

---

## 10. 파일 목록

**신규 생성:**

| 파일 | 역할 |
|------|------|
| `app/api/admin/users/route.ts` | POST mock 핸들러 (201) |
| `src/features/admin-dashboard/api/createUser.ts` | POST /api/admin/users 호출 |
| `src/features/admin-dashboard/ui/UserTabs.tsx` | 탭 + 모달 조율 Client Component |
| `src/features/admin-dashboard/ui/GuardianRegisterModal.tsx` | 보호자 등록 모달 |
| `src/features/admin-dashboard/ui/CaregiverRegisterModal.tsx` | 요양사 등록 모달 |

**수정:**

| 파일 | 변경 내용 |
|------|----------|
| `app/admin/users/page.tsx` | `UserTable` → `UserTabs` 교체 |
| `src/features/admin-dashboard/index.ts` | `UserTabs`, `createUser` export 추가 |

---

## 11. Implementation Guide

### 11.1 구현 순서

1. `app/api/admin/users/route.ts` — mock POST 핸들러
2. `src/features/admin-dashboard/api/createUser.ts` — API 함수 + 타입
3. `src/features/admin-dashboard/ui/GuardianRegisterModal.tsx`
4. `src/features/admin-dashboard/ui/CaregiverRegisterModal.tsx`
5. `src/features/admin-dashboard/ui/UserTabs.tsx`
6. `app/admin/users/page.tsx` 수정
7. `src/features/admin-dashboard/index.ts` 수정

### 11.2 핵심 의사결정

| 결정 | 이유 |
|------|------|
| `page.tsx` Server Component 유지 | fetchAdminUsers()가 서버 측 인증 헤더 필요 |
| `UserTable` 재사용 | 역할 필터링만 추가, 기존 deactivate 기능 그대로 유지 |
| 모달을 별도 파일로 분리 | 역할별 필드가 달라 단일 컴포넌트로 합치면 조건부 로직 복잡 |
| `createUser` API 독립 함수 | Plan R-05: FastAPI 연결 시 route.ts 내부만 교체 |
| 파일 업로드 UI만 구현 | Plan R-03/R-04: 백엔드 multipart 미지원, `JSON.stringify` 제외 |

### 11.3 Session Guide

| 모듈 | 파일 수 | 내용 |
|------|---------|------|
| M1 — API Layer | 2 | `route.ts` mock + `createUser.ts` |
| M2 — UserTabs | 1 | 탭 UI + 빈 상태 |
| M3 — GuardianModal | 1 | 보호자 등록 모달 |
| M4 — CaregiverModal | 1 | 요양사 등록 모달 |
| M5 — Wiring | 2 | `page.tsx` 수정 + `index.ts` 수정 |

권장 세션 분할:
- **Session 1**: M1 + M2 (`/pdca do admin-user-tabs --scope M1,M2`)
- **Session 2**: M3 + M4 + M5 (`/pdca do admin-user-tabs --scope M3,M4,M5`)

---

## 12. 성공 기준 추적

| SC | 기준 | 구현 위치 |
|----|------|-----------|
| SC-01 | 탭 전환 시 역할 목록 표시 | `UserTabs` — `activeTab` state + filter |
| SC-02 | 보호자 등록 모달 오픈/제출 | `GuardianRegisterModal` — useMutation |
| SC-03 | 요양사 등록 모달 오픈/제출 | `CaregiverRegisterModal` — useMutation |
| SC-04 | 필수 필드 미입력 에러 | react-hook-form `required` validation |
| SC-05 | 파일 필드 UI 표시 | `input type="file"` — family_certificate, certificate |
| SC-06 | `pnpm tsc --noEmit` 에러 없음 | strict 타입, `CreateUserRequest` 유니온 타입 |
