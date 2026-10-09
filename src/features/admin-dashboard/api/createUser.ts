// Design Ref: §5.1 — POST /api/admin/users 호출
// Plan SC: SC-02, SC-03 — 보호자/요양사 등록 API

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
  senior_name: string;
  relationship: "자녀" | "배우자" | "형제/자매" | "부모" | "기타";
  address?: string;
  emergency_contact?: string;
}

interface CaregiverFields {
  role: "caregiver";
  license_number: string;
  experience_years?: number;
}

export type CreateUserRequest =
  (BaseUserFields & GuardianFields) | (BaseUserFields & CaregiverFields);

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
