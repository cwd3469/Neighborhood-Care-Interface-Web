"use client";
// Design Ref: §7.3 — 가장 복잡한 컴포넌트: 드롭다운 + 인라인 CRUD
// Plan SC: SC-07, SC-08, SC-09
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { components } from "@shared/api/schema";
import {
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from "../api/schedules";

type ScheduleResponse = components["schemas"]["ScheduleResponse"];
type ScheduleCreate = components["schemas"]["ScheduleCreate"];
type ScheduleUpdate = components["schemas"]["ScheduleUpdate"];
type SeniorResponse = components["schemas"]["SeniorResponse"];
type UserResponse = components["schemas"]["UserResponse"];

interface Props {
  schedules: ScheduleResponse[];
  seniors: SeniorResponse[];
  caregivers: UserResponse[]; // role=caregiver && is_active 필터 완료된 목록
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: "예정",
  in_progress: "진행중",
  completed: "완료",
  cancelled: "취소됨",
};

const STATUS_COLOR: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const EMPTY_CREATE: ScheduleCreate = {
  senior_id: 0,
  caregiver_id: 0,
  scheduled_date: "",
  start_time: "",
  end_time: "",
  notes: "",
};

export function ScheduleTable({ schedules, seniors, caregivers }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ScheduleUpdate>({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<ScheduleCreate>(EMPTY_CREATE);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const seniorMap = Object.fromEntries(seniors.map((s) => [s.id, s.full_name]));
  const caregiverMap = Object.fromEntries(
    caregivers.map((c) => [c.id, c.full_name ?? c.username]),
  );

  function startEdit(schedule: ScheduleResponse) {
    setEditingId(schedule.id);
    setEditForm({
      scheduled_date: schedule.scheduled_date,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      caregiver_id: schedule.caregiver_id,
      notes: schedule.notes ?? "",
    });
  }

  async function handleUpdate() {
    if (!editingId) return;
    setPendingId(editingId);
    const result = await updateSchedule(editingId, editForm);
    setPendingId(null);
    if (!result.ok) {
      setError(result.error ?? "수정 실패");
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(id: number) {
    if (!window.confirm("일정을 삭제하시겠습니까?")) return;
    setPendingId(id);
    const result = await deleteSchedule(id);
    setPendingId(null);
    if (!result.ok) {
      setError(result.error ?? "삭제 실패");
      return;
    }
    router.refresh();
  }

  async function handleCreate() {
    if (
      !createForm.senior_id ||
      !createForm.caregiver_id ||
      !createForm.scheduled_date ||
      !createForm.start_time ||
      !createForm.end_time
    ) {
      setError("어르신, 요양사, 날짜, 시작/종료시간은 필수입니다.");
      return;
    }
    setPendingId(-1);
    const result = await createSchedule(createForm);
    setPendingId(null);
    if (!result.ok) {
      setError(result.error ?? "생성 실패");
      return;
    }
    setCreateForm(EMPTY_CREATE);
    setShowCreateForm(false);
    router.refresh();
  }

  // Design Ref: §7.3 — 수정 중일 때 다른 행 수정/삭제 비활성화
  const isLocked = editingId !== null || pendingId !== null;

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-center justify-between rounded-md bg-red-50 p-3 text-sm text-red-700">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                어르신
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                요양사
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                날짜
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                시간
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                상태
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {schedules.map((schedule) =>
              editingId === schedule.id ? (
                // Plan SC: SC-08 — 수정 행 (senior_id 변경 불가 — ScheduleUpdate 스키마 제약)
                <tr key={schedule.id} className="bg-blue-50">
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {seniorMap[schedule.senior_id] ?? `#${schedule.senior_id}`}
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={editForm.caregiver_id ?? schedule.caregiver_id}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          caregiver_id: Number(e.target.value),
                        }))
                      }
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    >
                      {caregivers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.full_name ?? c.username}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="date"
                      value={editForm.scheduled_date ?? ""}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          scheduled_date: e.target.value,
                        }))
                      }
                      className="rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="time"
                        value={editForm.start_time ?? ""}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            start_time: e.target.value,
                          }))
                        }
                        className="w-24 rounded border border-gray-300 px-1 py-1 text-sm"
                      />
                      <span className="text-gray-400">~</span>
                      <input
                        type="time"
                        value={editForm.end_time ?? ""}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            end_time: e.target.value,
                          }))
                        }
                        className="w-24 rounded border border-gray-300 px-1 py-1 text-sm"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {STATUS_LABEL[schedule.status]}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <button
                      onClick={handleUpdate}
                      disabled={pendingId === schedule.id}
                      className="mr-2 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      취소
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={schedule.id}>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {seniorMap[schedule.senior_id] ?? `#${schedule.senior_id}`}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {caregiverMap[schedule.caregiver_id] ??
                      `#${schedule.caregiver_id}`}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {schedule.scheduled_date}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {schedule.start_time} ~ {schedule.end_time}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[schedule.status] ?? "bg-gray-100 text-gray-500"}`}
                    >
                      {STATUS_LABEL[schedule.status] ?? schedule.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => startEdit(schedule)}
                      disabled={isLocked}
                      className="mr-3 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-30"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(schedule.id)}
                      disabled={isLocked}
                      className="text-sm text-red-600 hover:text-red-800 disabled:opacity-30"
                    >
                      {pendingId === schedule.id ? "..." : "삭제"}
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      {showCreateForm ? (
        // Plan SC: SC-07 — 일정 생성 폼 (드롭다운 + 날짜/시간)
        <div className="rounded-lg border border-dashed border-blue-300 bg-blue-50 p-4 space-y-3">
          <p className="text-sm font-medium text-blue-700">일정 생성</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-gray-500">
                어르신 *
              </label>
              <select
                value={createForm.senior_id || ""}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    senior_id: Number(e.target.value),
                  }))
                }
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
              >
                <option value="">선택</option>
                {seniors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">
                요양사 *
              </label>
              <select
                value={createForm.caregiver_id || ""}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    caregiver_id: Number(e.target.value),
                  }))
                }
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
              >
                <option value="">선택</option>
                {caregivers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name ?? c.username}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">날짜 *</label>
              <input
                type="date"
                value={createForm.scheduled_date}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    scheduled_date: e.target.value,
                  }))
                }
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">
                시작시간 *
              </label>
              <input
                type="time"
                value={createForm.start_time}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, start_time: e.target.value }))
                }
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">
                종료시간 *
              </label>
              <input
                type="time"
                value={createForm.end_time}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, end_time: e.target.value }))
                }
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">
                메모 (선택)
              </label>
              <input
                placeholder="메모"
                value={createForm.notes ?? ""}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, notes: e.target.value }))
                }
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={pendingId === -1}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {pendingId === -1 ? "생성 중..." : "생성"}
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setCreateForm(EMPTY_CREATE);
              }}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowCreateForm(true)}
          className="rounded border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600"
        >
          + 일정 생성
        </button>
      )}
    </div>
  );
}
