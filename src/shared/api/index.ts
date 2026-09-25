// Design Ref: §4.4 — public API: ApiResponse 제거, ApiError + createApiClient 유지
export type { ApiError } from "./types";
export type { ApiClient } from "./client";

import { createApiClient } from "./client";
export { createApiClient };

/**
 * 앱 전체에서 공유하는 API 클라이언트 싱글톤.
 * import { api } from '@shared/api'
 *
 * ⚠️  Next.js App Router: Server Component에서는 직접 fetch 사용 권장.
 *     이 싱글톤은 Client Component('use client') 내에서만 사용할 것.
 */
export const api = createApiClient(process.env.NEXT_PUBLIC_API_URL ?? "");
