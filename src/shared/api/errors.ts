// Design Ref: §2.1 — parseFetchError: AxiosError 의존성 제거, native fetch Response 기반
// Plan SC: SC-04
import type { ApiError } from "./types";

const STATUS_CODE_MAP: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  422: "VALIDATION_ERROR",
  500: "INTERNAL_ERROR",
};

export function parseFetchError(status: number, body?: unknown): ApiError {
  const data =
    body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : undefined;
  const detail = data?.detail ?? null;
  const message = typeof detail === "string" ? detail : `HTTP ${status}`;
  return {
    status,
    message,
    detail,
    code:
      STATUS_CODE_MAP[status] ??
      (status === 0 ? "NETWORK_ERROR" : "UNKNOWN_ERROR"),
  };
}
