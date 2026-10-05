"use client";
// Design Ref: §3.3 — 로그인 폼 UI
// Plan SC: SC-01, SC-02
import { useForm } from "react-hook-form";
import { useLogin } from "../model/useLogin";

interface FormValues {
  username: string;
  password: string;
}

export function LoginForm() {
  const { login, isPending, error } = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>();

  return (
    <form
      onSubmit={handleSubmit((data) => login(data))}
      className="flex flex-col gap-4 w-full max-w-sm"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="username" className="text-sm font-medium text-gray-700">
          유저 아이디
        </label>
        <input
          id="username"
          placeholder="username"
          className="rounded-md border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
          {...register("username", { required: "이메일을 입력하세요." })}
        />
        {errors.username && (
          <p role="alert" className="text-sm text-red-600">
            {errors.username.message}
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
          autoComplete="current-password"
          placeholder="비밀번호 입력"
          className="rounded-md border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
          {...register("password", { required: "비밀번호를 입력하세요." })}
        />
        {errors.password && (
          <p role="alert" className="text-sm text-red-600">
            {errors.password.message}
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
        {isPending ? "로그인 중..." : "로그인"}
      </button>
    </form>
  );
}
