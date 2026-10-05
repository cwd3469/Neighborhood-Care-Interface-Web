"use client";
// Design Ref: §3.2 — 로그인 상태 관리 훅
// Plan SC: SC-02, SC-04
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { loginApi, type LoginRequest } from "../api/login";
import { PAGE_PATH } from "@/src/shared/const/page";

export function useLogin() {
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: (data: LoginRequest) => loginApi(data),
    onSuccess: () => {
      router.push(PAGE_PATH.DASHBOARD);
    },
  });

  return {
    login: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error?.message ?? null,
  };
}
