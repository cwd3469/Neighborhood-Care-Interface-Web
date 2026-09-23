// Design Ref: §4 — HTTP 상태 코드 → ApiError 변환
// Plan SC: R-08 — FastAPI 422 ValidationError { detail: [...] } 매핑

import type { ApiError } from './types';

const STATUS_CODE_MAP: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  422: 'VALIDATION_ERROR',
  500: 'INTERNAL_ERROR',
};

/**
 * HTTP Response를 ApiError로 변환.
 * response.json()을 한 번 소비하므로 호출 후 body를 다시 읽을 수 없음.
 */
export async function parseError(response: Response): Promise<ApiError> {
  let detail: unknown = null;
  let message = `HTTP ${response.status}`;

  try {
    const body = await response.json() as Record<string, unknown>;
    detail = body.detail ?? body;
    // FastAPI: detail이 문자열이면 그대로, 배열(422)이면 상태 코드 기반 메시지
    message = typeof body.detail === 'string'
      ? body.detail
      : `HTTP ${response.status}`;
  } catch {
    // JSON 파싱 실패 시 statusText 사용
    message = response.statusText || `HTTP ${response.status}`;
  }

  return {
    status: response.status,
    message,
    detail,
    code: STATUS_CODE_MAP[response.status] ?? 'UNKNOWN_ERROR',
  };
}
