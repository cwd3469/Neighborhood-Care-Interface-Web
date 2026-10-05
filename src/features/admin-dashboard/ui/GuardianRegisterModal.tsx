"use client";
// Design Ref: §4.2 — 보호자 등록 모달
// Plan SC: SC-02, SC-04, SC-05
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { createUser } from "../api/createUser";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface GuardianFormValues {
  full_name: string;
  username: string;
  password: string;
  phone?: string;
  relationship: "자녀" | "배우자" | "형제/자매" | "부모" | "기타";
  address?: string;
  emergency_contact?: string;
  family_certificate?: FileList;
}

const inputCls =
  "rounded-md border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500 w-full";

export function GuardianRegisterModal({ open, onClose }: Props) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GuardianFormValues>();

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">보호자 등록</h2>
        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          className="flex flex-col gap-3"
        >
          {/* 공통 필드 */}
          <div className="flex flex-col gap-1">
            <label htmlFor="g-full_name" className="text-sm font-medium text-gray-700">이름 *</label>
            <input
              id="g-full_name"
              className={inputCls}
              {...register("full_name", { required: "이름을 입력하세요." })}
            />
            {errors.full_name && (
              <p role="alert" className="text-sm text-red-600">{errors.full_name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="g-username" className="text-sm font-medium text-gray-700">아이디 *</label>
            <input
              id="g-username"
              className={inputCls}
              {...register("username", { required: "아이디를 입력하세요." })}
            />
            {errors.username && (
              <p role="alert" className="text-sm text-red-600">{errors.username.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="g-password" className="text-sm font-medium text-gray-700">비밀번호 *</label>
            <input
              id="g-password"
              type="password"
              className={inputCls}
              {...register("password", {
                required: "비밀번호를 입력하세요.",
                minLength: { value: 8, message: "8자 이상 입력하세요." },
              })}
            />
            {errors.password && (
              <p role="alert" className="text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="g-phone" className="text-sm font-medium text-gray-700">전화번호</label>
            <input id="g-phone" type="tel" className={inputCls} {...register("phone")} />
          </div>

          {/* 보호자 전용 필드 */}
          <div className="flex flex-col gap-1">
            <label htmlFor="g-relationship" className="text-sm font-medium text-gray-700">피보호자와의 관계 *</label>
            <select
              id="g-relationship"
              className={inputCls}
              {...register("relationship", { required: "관계를 선택하세요." })}
            >
              <option value="">선택</option>
              {["자녀", "배우자", "형제/자매", "부모", "기타"].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            {errors.relationship && (
              <p role="alert" className="text-sm text-red-600">{errors.relationship.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="g-address" className="text-sm font-medium text-gray-700">주소</label>
            <input id="g-address" className={inputCls} {...register("address")} />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="g-emergency_contact" className="text-sm font-medium text-gray-700">비상연락처</label>
            <input id="g-emergency_contact" type="tel" className={inputCls} {...register("emergency_contact")} />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="g-family_certificate" className="text-sm font-medium text-gray-700">가족관계증명서</label>
            <input id="g-family_certificate" type="file" className="text-sm text-gray-700" {...register("family_certificate")} />
          </div>

          {mutation.error && (
            <p role="alert" className="text-sm text-red-600">{mutation.error.message}</p>
          )}

          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {mutation.isPending ? "등록 중..." : "등록"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
