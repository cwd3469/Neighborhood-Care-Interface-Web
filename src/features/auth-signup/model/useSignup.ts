"use client";
// Design Ref: §3.2 — 회원가입 상태 관리 훅
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { signupApi, type SignupRequest } from "../api/signup";

export function useSignup() {
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: (data: SignupRequest) => signupApi(data),
    onSuccess: () => {
      router.push("/login");
    },
  });

  return {
    signup: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error?.message ?? null,
  };
}
