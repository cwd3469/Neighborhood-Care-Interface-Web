// Design Ref: §2.3 — axios 제거, native fetch wrapper + 401 retry
// Plan SC: SC-01, SC-02, SC-03
"use client";
import { parseFetchError } from "./errors";

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

async function parseResponse<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => undefined);
  if (!res.ok) throw parseFetchError(res.status, body);
  return body as T;
}

async function clientFetch(
  url: string,
  init?: RequestInit,
  _retried = false,
): Promise<Response> {
  const res = await fetch(url, init);
  if (res.status !== 401 || _retried) return res;

  // 401 → refresh 시도 (1회만)
  const refreshRes = await fetch("/api/auth/refresh", { method: "POST" });
  if (!refreshRes.ok) {
    window.location.href = "/login";
    return refreshRes;
  }

  // 재시도 (_retried=true 플래그로 무한 루프 방지)
  return fetch(url, init);
}

export const api = {
  get: <T>(url: string): Promise<T> =>
    clientFetch(url).then((r) => parseResponse<T>(r)),

  post: <T>(url: string, data?: unknown): Promise<T> =>
    clientFetch(url, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(data),
    }).then((r) => parseResponse<T>(r)),

  put: <T>(url: string, data?: unknown): Promise<T> =>
    clientFetch(url, {
      method: "PUT",
      headers: JSON_HEADERS,
      body: JSON.stringify(data),
    }).then((r) => parseResponse<T>(r)),

  patch: <T>(url: string, data?: unknown): Promise<T> =>
    clientFetch(url, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify(data),
    }).then((r) => parseResponse<T>(r)),

  delete: <T>(url: string): Promise<T> =>
    clientFetch(url, { method: "DELETE" }).then((r) => parseResponse<T>(r)),
};
