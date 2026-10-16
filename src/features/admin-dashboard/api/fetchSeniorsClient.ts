import type { components } from "@shared/api/schema";

export type SeniorOption = Pick<
  components["schemas"]["SeniorResponse"],
  "id" | "full_name"
>;

export async function fetchSeniorsClient(): Promise<SeniorOption[]> {
  const res = await fetch("/api/seniors");
  if (!res.ok) return [];
  return res.json();
}
