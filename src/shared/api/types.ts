// Design Ref: §4.1 — ApiResponse 제거, ApiError만 유지
// react-query가 error 상태를 관리하므로 래퍼 타입 불필요

export interface ApiError {
  /** HTTP 상태 코드 (0 = network error) */
  status: number;
  /** 사람이 읽을 수 있는 에러 메시지 */
  message: string;
  /** FastAPI detail 필드 (422: [{ loc, msg, type }] 배열 그대로 보존) */
  detail: unknown;
  /** 커스텀 에러 코드 */
  code: string;
}
