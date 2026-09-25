// Design Ref: §4.3 — AxiosInstance + request/response interceptors
// Plan SC: R-01, R-02, R-03, R-04
import axios from 'axios'
import type { AxiosInstance } from 'axios'
import { parseAxiosError } from './errors'

export function createApiClient(baseUrl: string) {
  // Plan SC: R-02 — setAuthToken을 통해 인증 feature에서 주입
  let token: string | null = null

  const instance: AxiosInstance = axios.create({
    baseURL: baseUrl,
    headers: { 'Content-Type': 'application/json' },
  })

  // Plan SC: R-02 — request interceptor: 토큰 자동 주입
  instance.interceptors.request.use((config) => {
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })

  // Plan SC: R-03 — response interceptor: AxiosError → ApiError throw
  instance.interceptors.response.use(
    (res) => res,
    (err) => Promise.reject(parseAxiosError(err))
  )

  return {
    /** JWT 토큰 설정. null 전달 시 Authorization 헤더 제거 (로그아웃). */
    setAuthToken: (t: string | null): void => { token = t },
    instance,
  }
}

export type ApiClient = ReturnType<typeof createApiClient>
