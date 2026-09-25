// Design Ref: §4.2 — Client helpers, 캐시-first 전략
import type { components } from "@shared/api/schema";

type AiSummaryResponse = components["schemas"]["AiSummaryResponse"];

// Plan SC: SC-02 — 캐시 조회, 없으면 null 반환 (404)
export async function getSummary(
  recordId: number,
): Promise<AiSummaryResponse | null> {
  const res = await fetch(`/api/ai/summary/${recordId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("getSummary failed");
  return res.json();
}

// Plan SC: SC-03 — 생성 트리거, 생성된 요약 반환
export async function triggerSummary(
  recordId: number,
): Promise<{ ok: boolean; data?: AiSummaryResponse; error?: string }> {
  const res = await fetch(`/api/ai/summarize/${recordId}`, { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { ok: false, error: body.detail ?? "AI 요약 생성 실패" };
  }
  return { ok: true, data: await res.json() };
}
