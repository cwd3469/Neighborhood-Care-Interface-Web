// Design Ref: §5 — Closure Factory 패턴
// Plan SC: R-01, R-02, R-06, R-07

import type { ApiResponse } from './types';
import { parseError } from './errors';

/**
 * 내부 HTTP 요청 헬퍼 — 외부 미노출.
 * 성공 시 { data, error: null, status }, 실패 시 { data: null, error, status }.
 */
async function request<T>(
  method: string,
  url: string,
  headers: HeadersInit,
  body?: unknown,
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await parseError(response);
      return { data: null, error, status: response.status };
    }

    // 204 No Content — body가 없으므로 json() 호출 금지
    if (response.status === 204) {
      return { data: null, error: null, status: 204 };
    }

    const data = await response.json() as T;
    return { data, error: null, status: response.status };
  } catch (err) {
    // 네트워크 오류 (DNS 실패, 연결 거부 등) — fetch 자체가 throw
    return {
      data: null,
      error: {
        status: 0,
        message: err instanceof Error ? err.message : 'Network error',
        detail: null,
        code: 'NETWORK_ERROR',
      },
      status: 0,
    };
  }
}

/**
 * API 클라이언트 팩토리.
 * 클로저로 token 상태를 캡슐화하며, 각 호출마다 최신 헤더를 생성.
 *
 * @example
 * const api = createApiClient('http://localhost:8000')
 * const { data, error } = await api.get<Patient[]>('/patients')
 */
export function createApiClient(baseUrl: string) {
  // Plan SC: R-06 — setAuthToken을 통해 인증 feature에서 주입
  let token: string | null = null;

  const headers = (): HeadersInit => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  return {
    /** JWT 토큰 설정. null 전달 시 Authorization 헤더 제거 (로그아웃). */
    setAuthToken: (t: string | null): void => {
      token = t;
    },

    get: <T>(path: string): Promise<ApiResponse<T>> =>
      request<T>('GET', baseUrl + path, headers()),

    post: <T>(path: string, body: unknown): Promise<ApiResponse<T>> =>
      request<T>('POST', baseUrl + path, headers(), body),

    put: <T>(path: string, body: unknown): Promise<ApiResponse<T>> =>
      request<T>('PUT', baseUrl + path, headers(), body),

    patch: <T>(path: string, body: unknown): Promise<ApiResponse<T>> =>
      request<T>('PATCH', baseUrl + path, headers(), body),

    delete: <T>(path: string): Promise<ApiResponse<T>> =>
      request<T>('DELETE', baseUrl + path, headers()),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
