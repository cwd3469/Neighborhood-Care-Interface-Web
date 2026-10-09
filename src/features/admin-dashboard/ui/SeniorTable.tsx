"use client";
// Design Ref: §7.2 — 인라인 수정: editingId로 행 제어
// Plan SC: SC-04, SC-05, SC-06
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { components } from "@shared/api/schema";
import { createSenior, updateSenior, deleteSenior } from "../api/seniors";
import { AddressField } from "@shared/ui";

type SeniorResponse = components["schemas"]["SeniorResponse"];
type SeniorCreate = components["schemas"]["SeniorCreate"];
type SeniorUpdate = components["schemas"]["SeniorUpdate"];

interface Props {
  seniors: SeniorResponse[];
}

const EMPTY_ADD: SeniorCreate = {
  full_name: "",
  birth_date: "",
  gender: "",
  address: "",
  phone: "",
  medical_notes: "",
};

export function SeniorTable({ seniors }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<SeniorUpdate>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<SeniorCreate>(EMPTY_ADD);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function startEdit(senior: SeniorResponse) {
    setEditingId(senior.id);
    setEditForm({
      full_name: senior.full_name,
      birth_date: senior.birth_date,
      gender: senior.gender,
      address: senior.address ?? "",
      phone: senior.phone ?? "",
      medical_notes: senior.medical_notes ?? "",
    });
  }

  async function handleUpdate() {
    if (!editingId) return;
    setPendingId(editingId);
    const result = await updateSenior(editingId, editForm);
    setPendingId(null);
    if (!result.ok) {
      setError(result.error ?? "수정 실패");
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(id: number) {
    // Plan Risk R-03: 연관 일정 있으면 BE에서 에러 → detail 메시지 표시
    if (
      !window.confirm(
        "어르신 정보를 삭제하시겠습니까?\n연관 일정이 있으면 삭제되지 않을 수 있습니다.",
      )
    )
      return;
    setPendingId(id);
    const result = await deleteSenior(id);
    setPendingId(null);
    if (!result.ok) {
      setError(result.error ?? "삭제 실패");
      return;
    }
    router.refresh();
  }

  async function handleCreate() {
    if (
      !addForm.full_name ||
      !addForm.birth_date ||
      !addForm.gender ||
      !addForm.address
    ) {
      setError("이름, 생년월일, 성별, 주소는 필수입니다.");
      return;
    }
    setPendingId(-1);
    const result = await createSenior(addForm);
    setPendingId(null);
    if (!result.ok) {
      setError(result.error ?? "등록 실패");
      return;
    }
    setAddForm(EMPTY_ADD);
    setShowAddForm(false);
    router.refresh();
  }

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
                이름
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                생년월일
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                성별
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                주소
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {seniors.map((senior) =>
              editingId === senior.id ? (
                <tr key={senior.id} className="bg-blue-50">
                  <td className="px-2 py-2">
                    <input
                      value={editForm.full_name ?? ""}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          full_name: e.target.value,
                        }))
                      }
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="date"
                      value={editForm.birth_date ?? ""}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          birth_date: e.target.value,
                        }))
                      }
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      value={editForm.gender ?? ""}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, gender: e.target.value }))
                      }
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <AddressField
                      value={editForm.address ?? ""}
                      onChange={(addr) =>
                        setEditForm((f) => ({ ...f, address: addr }))
                      }
                    />
                  </td>
                  <td className="px-2 py-2 text-right">
                    <button
                      onClick={handleUpdate}
                      disabled={pendingId === senior.id}
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
                <tr key={senior.id}>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {senior.full_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {senior.birth_date}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {senior.gender}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {senior.address ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => startEdit(senior)}
                      disabled={isLocked}
                      className="mr-3 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-30"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(senior.id)}
                      disabled={isLocked}
                      className="text-sm text-red-600 hover:text-red-800 disabled:opacity-30"
                    >
                      {pendingId === senior.id ? "..." : "삭제"}
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      {showAddForm ? (
        <div className="rounded-lg border border-dashed border-blue-300 bg-blue-50 p-4 space-y-3">
          <p className="text-sm font-medium text-blue-700">어르신 등록</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <input
              placeholder="이름 *"
              value={addForm.full_name}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, full_name: e.target.value }))
              }
              className="rounded border border-gray-300 px-2 py-1 text-sm"
            />
            <input
              type="date"
              value={addForm.birth_date}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, birth_date: e.target.value }))
              }
              className="rounded border border-gray-300 px-2 py-1 text-sm"
            />
            <input
              placeholder="성별 * (예: 남, 여)"
              value={addForm.gender}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, gender: e.target.value }))
              }
              className="rounded border border-gray-300 px-2 py-1 text-sm"
            />
            <AddressField
              required
              value={addForm.address ?? ""}
              onChange={(addr) => setAddForm((f) => ({ ...f, address: addr }))}
            />
            <input
              placeholder="전화번호 (선택)"
              value={addForm.phone ?? ""}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, phone: e.target.value }))
              }
              className="rounded border border-gray-300 px-2 py-1 text-sm"
            />
            <input
              placeholder="특이사항 (선택)"
              value={addForm.medical_notes ?? ""}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, medical_notes: e.target.value }))
              }
              className="rounded border border-gray-300 px-2 py-1 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={pendingId === -1}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {pendingId === -1 ? "등록 중..." : "등록"}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setAddForm(EMPTY_ADD);
              }}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="rounded border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600"
        >
          + 어르신 등록
        </button>
      )}
    </div>
  );
}
