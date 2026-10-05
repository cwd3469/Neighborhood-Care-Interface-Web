"use client";
// Design Ref: §2.6 — 역할별 사이드바 + 반응형 (PC 항상 표시 / 모바일 오버레이)
// Plan SC: SC-03, SC-04, SC-05, SC-06
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "../nav-config";
import { useAuthStore } from "@features/auth-login";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AppSidebar({ open, onClose }: Props) {
  const user = useAuthStore((s) => s.user);
  const pathname = usePathname();
  console.log(user);
  const items = user ? NAV_ITEMS[user.role] : [];

  return (
    <>
      {/* 모바일 오버레이 배경 */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* 사이드바 본체 — PC: 항상 표시 / 모바일: open 시 표시 */}
      <aside
        className={[
          // 구조 (display 속성 없음)
          "flex-col border-r bg-white",
          // PC: 항상 표시 (SC-05) — @media로 hidden 덮어씌움
          "md:flex md:w-64",
          // 모바일: open 조건부 display (SC-06) — flex/hidden 충돌 방지
          open ? "flex fixed inset-y-0 left-0 z-50 w-64" : "hidden",
        ].join(" ")}
      >
        {/* 앱 타이틀 */}
        <div className="flex h-16 items-center border-b px-6 font-semibold text-gray-800">
          시니어 케어
        </div>

        {/* 네비게이션 메뉴 (SC-03, SC-04) */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={[
                "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-blue-50 text-blue-700" // 활성화 상태 (SC-04)
                  : "text-gray-700 hover:bg-gray-100",
              ].join(" ")}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
