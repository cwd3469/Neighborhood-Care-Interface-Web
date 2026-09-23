// Design Ref: §3 — Plan R-03, R-04 기반
// 순수 타입 파일 — 다른 모듈 import 없음

export interface ApiError {
  /** HTTP 상태 코드 (400, 401, 403, 404, 422, 500, 0 for network error) */
  status: number;
  /** 사람이 읽을 수 있는 에러 메시지 */
  message: string;
  /** FastAPI detail 필드 (422: [{ loc, msg, type }] 배열 그대로 보존) */
  detail: unknown;
  /** 커스텀 에러 코드 */
  code: string;
}

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  status: number;
}
