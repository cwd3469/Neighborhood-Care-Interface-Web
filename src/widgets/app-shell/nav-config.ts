// Design Ref: §2.5 — ROLE별 NavItem 배열
// Plan SC: SC-03
import type { ROLE } from "@features/auth-login";

export interface NavItem {
  label: string;
  href: string;
}

export const NAV_ITEMS: Record<ROLE, NavItem[]> = {
  guardian: [
    { label: "대시보드", href: "/guardian" },
    { label: "건강기록 조회", href: "/guardian/records" },
    { label: "방문일정", href: "/guardian/schedules" },
    { label: "케어기버 목록", href: "/guardian/caregivers" },
  ],
  caregiver: [
    { label: "대시보드", href: "/caregiver" },
    { label: "오늘 방문 일정", href: "/caregiver/schedules" },
    { label: "건강기록 입력", href: "/caregiver/records" },
    { label: "담당 어르신 목록", href: "/caregiver/seniors" },
  ],
  admin: [
    { label: "대시보드", href: "/admin" },
    { label: "회원 관리", href: "/admin/users" },
    { label: "일정 관리", href: "/admin/schedules" },
    { label: "어르신 관리", href: "/admin/seniors" },
  ],
};
