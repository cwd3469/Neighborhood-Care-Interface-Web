// Design Ref: §4.5 — QueryClient 인스턴스 (싱글톤)
// Plan SC: R-05
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1분 캐시
      retry: 1, // 실패 시 1회 재시도
    },
  },
});
