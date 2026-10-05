"use client";
// Design Ref: §3.3 — 회원가입 폼 UI
// Plan SC: SC-02 — passwordConfirm 불일치 인라인 에러
import { useForm } from "react-hook-form";
import { useSignup } from "../model/useSignup";

interface FormValues {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
}

export function SignupForm() {
  const { signup, isPending, error } = useSignup();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>();

  return (
    <form
      onSubmit={handleSubmit(({ name, email, password }) =>
        signup({ name, email, password })
      )}
      className="flex flex-col gap-4 w-full max-w-sm"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium text-gray-700">
          이름
        </label>
        <input
          id="name"
          autoComplete="name"
          placeholder="홍길동"
          className="rounded-md border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
          {...register("name", { required: "이름을 입력하세요." })}
        />
        {errors.name && (
          <p role="alert" className="text-sm text-red-600">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-gray-700">
          이메일
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="example@email.com"
          className="rounded-md border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
          {...register("email", { required: "이메일을 입력하세요." })}
        />
        {errors.email && (
          <p role="alert" className="text-sm text-red-600">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-gray-700">
          비밀번호
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="8자 이상 입력"
          className="rounded-md border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          htmlFor="passwordConfirm"
          className="text-sm font-medium text-gray-700"
        >
          비밀번호 확인
        </label>
        <input
          id="passwordConfirm"
          type="password"
          autoComplete="new-password"
          placeholder="비밀번호 재입력"
          className="rounded-md border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
          {...register("passwordConfirm", {
            required: "비밀번호 확인을 입력하세요.",
            validate: (value) =>
              value === watch("password") || "비밀번호가 일치하지 않습니다.",
          })}
        />
        {errors.passwordConfirm && (
          <p role="alert" className="text-sm text-red-600">
            {errors.passwordConfirm.message}
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? "가입 중..." : "회원가입"}
      </button>
    </form>
  );
}
