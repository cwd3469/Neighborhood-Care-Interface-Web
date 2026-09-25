// Design Ref: §4.2 — Server Component 전용 fetch
// Plan SC: SC-05, SC-07
import { SERVER_API_URL, getServerApiHeaders } from "@shared/api/server";
import type { components } from "@shared/api/schema";

export type ScheduleResponse = components["schemas"]["ScheduleResponse"];

export async function fetchSchedules(
  seniorId: number,
): Promise<ScheduleResponse[]> {
  const res = await fetch(`${SERVER_API_URL}/schedules?senior_id=${seniorId}`, {
    headers: await getServerApiHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`fetchSchedules failed: ${res.status}`);
  return res.json();
}
