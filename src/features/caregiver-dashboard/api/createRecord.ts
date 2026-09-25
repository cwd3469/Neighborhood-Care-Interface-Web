// Design Ref: §5.2 — Client Component에서 호출, fhir_response: {} Route Handler에서 삽입
export async function createRecord(payload: {
  senior_id: number;
  schedule_id?: number;
  visit_notes: string;
}): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: data.detail ?? "기록 저장에 실패했습니다." };
  }
  return { ok: true };
}
