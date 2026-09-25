// Design Ref: §3.5 — Server Component shell
// Plan SC: SC-01 — /signup 페이지 렌더링
import type { Metadata } from "next";
import { SignupForm } from "@features/auth-signup";

export const metadata: Metadata = {
  title: "회원가입 — 시니어 케어 매니저",
};

export default function SignupPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-[#eee]">
      <div className="w-full max-w-sm space-y-6 bg-gray-800 dark:bg-white p-4 rounded-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            시니어 케어 매니저
          </h1>
          <p className="mt-1 text-sm text-gray-500">새 계정을 만드세요</p>
        </div>
        <SignupForm />
      </div>
    </main>
  );
}
