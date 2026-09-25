// Design Ref: §4.2 — AxiosError → ApiError 변환
// Plan SC: SC-04
import type { AxiosError } from 'axios'
import type { ApiError } from './types'

const STATUS_CODE_MAP: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  422: 'VALIDATION_ERROR',
  500: 'INTERNAL_ERROR',
}

export function parseAxiosError(err: AxiosError): ApiError {
  const status = err.response?.status ?? 0
  const body = err.response?.data as Record<string, unknown> | undefined
  const detail = body?.detail ?? null
  const message = typeof detail === 'string'
    ? detail
    : err.message || `HTTP ${status}`
  return {
    status,
    message,
    detail,
    code: STATUS_CODE_MAP[status] ?? (status === 0 ? 'NETWORK_ERROR' : 'UNKNOWN_ERROR'),
  }
}
