// Design Ref: §5.2 — 전체 일정 조회 (필터 없음, 관리자 전용)
import { SERVER_API_URL, getServerApiHeaders } from "@shared/api/server";
import type { components } from "@shared/api/schema";

type ScheduleResponse = components["schemas"]["ScheduleResponse"];

export async function fetchAllSchedules(): Promise<ScheduleResponse[]> {
  const res = await fetch(`${SERVER_API_URL}/schedules`, {
    headers: await getServerApiHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`fetchAllSchedules failed: ${res.status}`);
  return res.json();
}
