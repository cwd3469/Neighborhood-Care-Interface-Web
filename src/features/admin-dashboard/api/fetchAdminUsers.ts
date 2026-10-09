// Design Ref: §5.1 — Server Component 전용, getServerApiHeaders() 사용
import { SERVER_API_URL, getServerApiHeaders } from "@shared/api/server";
import type { components } from "@shared/api/schema";

type UserResponse = components["schemas"]["UserResponse"];

export async function fetchAdminUsers(): Promise<UserResponse[]> {
  const url = `${SERVER_API_URL}/admin/users`;
  const res = await fetch(url, {
    headers: await getServerApiHeaders(),
    cache: "no-store",
  });

  const data = await res.json().catch(() => null); // 바디는 한 번만 읽기

  if (process.env.NODE_ENV === "development") {
    console.log(`[server fetch] GET ${url} → ${res.status} ${res.statusText}`);
    console.dir(data, { depth: null }); // 중첩 객체까지 전부 출력
  }

  if (!res.ok) throw new Error(`fetchAdminUsers failed: ${res.status}`);
  return data as UserResponse[];
}
