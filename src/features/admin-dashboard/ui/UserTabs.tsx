"use client";
// Design Ref: §4.1 — 탭 UI + 모달 조율 Client Component
// Plan SC: SC-01 — 탭 전환 시 역할별 목록 표시
import { useState } from "react";
import type { components } from "@shared/api/schema";
import { UserTable } from "./UserTable";
import { GuardianRegisterModal } from "./GuardianRegisterModal";
import { CaregiverRegisterModal } from "./CaregiverRegisterModal";

type UserResponse = components["schemas"]["UserResponse"];
type Tab = "guardian" | "caregiver";

const TAB_LABELS: Record<Tab, string> = {
  guardian: "보호자",
  caregiver: "요양사",
};

interface Props {
  users: UserResponse[];
}

export function UserTabs({ users }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("guardian");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filtered = users.filter((u) => u.role === activeTab);

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    setIsModalOpen(false);
  }

  return (
    <div>
      {/* 탭 헤더 */}
      <div className="flex items-center justify-between border-b border-gray-200 mb-4">
        <div className="flex">
          {(["guardian", "caregiver"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px " +
                (activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700")
              }
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          + {TAB_LABELS[activeTab]} 등록
        </button>
      </div>

      {/* 목록 */}
      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-500">
          등록된 {TAB_LABELS[activeTab]}가 없습니다.
        </p>
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
