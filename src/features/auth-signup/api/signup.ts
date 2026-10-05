// Design Ref: §3.1 — Next.js Route Handler 프록시 호출
export interface SignupRequest {
  name: string;
  email: string;
  password: string;
}

export async function signupApi(body: SignupRequest): Promise<void> {
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail ?? "회원가입에 실패했습니다.");
  }
}
