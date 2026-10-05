"use client";
// Design Ref: §4.3 — 요양사 등록 모달
// Plan SC: SC-03, SC-04, SC-05
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { createUser } from "../api/createUser";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface CaregiverFormValues {
  full_name: string;
  username: string;
  password: string;
  phone?: string;
  license_number: string;
  experience_years?: number;
  certificate?: FileList;
}

const inputCls =
  "rounded-md border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500 w-full";

export function CaregiverRegisterModal({ open, onClose }: Props) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CaregiverFormValues>();

  const mutation = useMutation({
    mutationFn: (data: CaregiverFormValues) =>
      createUser({
        role: "caregiver",
        username: data.username,
        password: data.password,
        full_name: data.full_name,
        phone: data.phone,
        license_number: data.license_number,
        experience_years: data.experience_years,
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
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          요양사 등록
        </h2>
        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          className="flex flex-col gap-3"
        >
          {/* 공통 필드 */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="c-full_name"
              className="text-sm font-medium text-gray-700"
            >
              이름 *
            </label>
            <input
              id="c-full_name"
              className={inputCls}
              {...register("full_name", { required: "이름을 입력하세요." })}
            />
            {errors.full_name && (
              <p role="alert" className="text-sm text-red-600">
                {errors.full_name.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="c-username"
              className="text-sm font-medium text-gray-700"
            >
              아이디 *
            </label>
            <input
              id="c-username"
              className={inputCls}
              {...register("username", { required: "아이디를 입력하세요." })}
            />
            {errors.username && (
              <p role="alert" className="text-sm text-red-600">
                {errors.username.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="c-password"
              className="text-sm font-medium text-gray-700"
            >
              비밀번호 *
            </label>
            <input
              id="c-password"
              type="password"
              className={inputCls}
              {...register("password", {
                required: "비밀번호를 입력하세요.",
                minLength: { value: 8, message: "8자 이상 입력하세요." },
              })}
            />
            {errors.password && (
              <p role="alert" className="text-sm text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="c-phone"
              className="text-sm font-medium text-gray-700"
            >
              전화번호
            </label>
            <input
              id="c-phone"
              type="tel"
              className={inputCls}
              {...register("phone")}
            />
          </div>

          {/* 요양사 전용 필드 */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="c-license_number"
              className="text-sm font-medium text-gray-700"
            >
              요양사 면허번호 *
            </label>
            <input
              id="c-license_number"
              className={inputCls}
              {...register("license_number", {
                required: "면허번호를 입력하세요.",
              })}
            />
            {errors.license_number && (
              <p role="alert" className="text-sm text-red-600">
                {errors.license_number.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="c-experience_years"
              className="text-sm font-medium text-gray-700"
            >
              경력 연수
            </label>
            <input
              id="c-experience_years"
              type="number"
              min={0}
              className={inputCls}
              {...register("experience_years", { valueAsNumber: true })}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="c-certificate"
              className="text-sm font-medium text-gray-700"
            >
              자격증 파일
            </label>
            <input
              id="c-certificate"
              type="file"
              className="text-sm text-gray-700"
              {...register("certificate")}
            />
          </div>

          {mutation.error && (
            <p role="alert" className="text-sm text-red-600">
              {mutation.error.message}
            </p>
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
