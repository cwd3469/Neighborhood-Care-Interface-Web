// Design Ref: §2.4 — 401 에러는 interceptor가 처리, react-query retry 제외
// Plan SC: SC-05
import { QueryClient } from "@tanstack/react-query";
import type { ApiError } from "./types";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1분 캐시
      retry: (failureCount, error) => {
        // 401은 axios interceptor가 refresh 처리 → react-query 재시도 불필요
        if ((error as unknown as ApiError).status === 401) return false;
        return failureCount < 1;
      },
    },
  },
});
