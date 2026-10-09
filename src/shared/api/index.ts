// Design Ref: §2.2 — public API (Client Component 전용)
// ⚠️ server.ts는 Server Component 전용 — 여기서 re-export 금지
export { api } from "./client";
export { queryClient } from "./query";
export type { ApiError } from "./types";
