// Design Ref: §4.2 — AuthUser type + AuthContext
// Plan SC: SC-01, SC-02

export type ROLE = "guardian" | "caregiver" | "admin";

export interface AuthUser {
  role: ROLE;
  name: string; // Design Ref: §2.3 — 헤더 이름 표시용
}
