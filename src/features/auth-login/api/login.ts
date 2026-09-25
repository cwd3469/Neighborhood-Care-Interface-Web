// Design Ref: §3.1 — Next.js Route Handler 프록시 호출
// Plan SC: SC-02, SC-03

import {api} from "@shared/api";

// grant_type , username , password
export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResult {
  ok: boolean
  error?: string
}

export async function loginApi(body: LoginRequest): Promise<LoginResult> {
  const res = await api.instance.post('/login', body , {
    headers: {
      "Content-Type":"application/x-www-form-urlencoded"
    }
  })

  if(res.status === 200){
    
    api.setAuthToken(`${res.data.token_type} 
      ${res.data.access_token}`)
  }
  return { ok: true }
}
