// Design Ref: §2.1 — axios 싱글톤 + 동시 401 큐 패턴
// Plan SC: SC-01, SC-02, SC-03, SC-04
"use client";
import axios, { type InternalAxiosRequestConfig } from "axios";
import { parseAxiosError } from "./errors";

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// ── router setter (interceptor에서 useRouter 직접 호출 불가) ──────────
let _navigateToLogin: (() => void) | null = null;

export function setNavigateToLogin(fn: () => void): void {
  _navigateToLogin = fn;
}

function navigateToLogin(): void {
  if (_navigateToLogin) {
    _navigateToLogin();
  } else {
    // fallback: providers.tsx 마운트 전 또는 setter 미등록 시
    window.location.href = "/login";
  }
}

// ── 동시 401 큐 (Plan SC: SC-01 — 동시 요청 모두 재시도 보장) ────────
type QueueItem = {
  resolve: () => void;
  reject: (err: unknown) => void;
};
let isRefreshing = false;

let failedQueue: QueueItem[] = [];

const onFailedQueueResolve = () => {
  failedQueue.forEach((item) => {
    item.resolve();
  });
  failedQueue = [];
};

const onFailedQueueReject = (error: unknown) => {
  failedQueue.forEach((item) => {
    item.reject(error);
  });
  failedQueue = [];
};

// ── axios 인스턴스 ────────────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: "", // 같은 origin — Next.js Route Handler 호출
  withCredentials: true, // httpOnly 쿠키 자동 전송
  headers: { "Content-Type": "application/json" },
});

// ── response interceptor ─────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error: Parameters<typeof parseAxiosError>[0]) => {
    const originalRequest = error.config as RetryableConfig | undefined;
    if (!originalRequest) return Promise.reject(parseAxiosError(error));

    // 401이 아니거나 이미 retry 시도한 요청 → 그냥 throw
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(parseAxiosError(error));
    }

    if (isRefreshing) {
      // 다른 요청이 refresh 중 → 큐에서 대기
      return new Promise<void>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => apiClient(originalRequest))
        .catch((err: unknown) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      await apiClient.post("/api/auth/refresh");
      // 큐에 저장 된 요청 건 실행
      onFailedQueueResolve();
      return apiClient(originalRequest);
    } catch (refreshError: unknown) {
      // 큐에 저장 된 요청 건 취소
      onFailedQueueReject(refreshError);
      navigateToLogin();
      return Promise.reject(parseAxiosError(error));
    } finally {
      isRefreshing = false;
    }
  },
);

// ── public API ────────────────────────────────────────────────────────
export const api = {
  get: <T>(
    url: string,
    config?: Parameters<typeof apiClient.get>[1],
  ): Promise<T> => apiClient.get<T>(url, config).then((r) => r.data),

  post: <T>(
    url: string,
    data?: unknown,
    config?: Parameters<typeof apiClient.post>[2],
  ): Promise<T> => apiClient.post<T>(url, data, config).then((r) => r.data),

  put: <T>(
    url: string,
    data?: unknown,
    config?: Parameters<typeof apiClient.put>[2],
  ): Promise<T> => apiClient.put<T>(url, data, config).then((r) => r.data),

  patch: <T>(
    url: string,
    data?: unknown,
    config?: Parameters<typeof apiClient.patch>[2],
  ): Promise<T> => apiClient.patch<T>(url, data, config).then((r) => r.data),

  delete: <T>(
    url: string,
    config?: Parameters<typeof apiClient.delete>[1],
  ): Promise<T> => apiClient.delete<T>(url, config).then((r) => r.data),
};
