# [Report] auth-signup

**작성일**: 2026-09-25
**Feature**: auth-signup
**Match Rate**: 100% (SC 7/7)
**Phase**: Completed

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | guardian(보호자)이 서비스에 가입할 방법 없음 — 로그인 페이지에 진입점도 없는 상태 |
| **Solution** | `src/features/auth-signup/` FSD feature + Next.js Route Handler FastAPI 프록시 — auth-login과 대칭 패턴 |
| **Function UX Effect** | 이름·이메일·비밀번호 입력 → 가입 성공 → `/login` 리디렉션, 비밀번호 확인 불일치 즉시 인라인 에러 표시 |
| **Core Value** | guardian 자유 가입 경로 완성 — role 서버 고정 주입으로 권한 에스컬레이션 원천 차단 |

### Value Delivered

| 지표 | 결과 |
|------|------|
| 생성 파일 | 7개 |
| 수정 파일 | 1개 |
| 총 코드 | ~150줄 |
| TypeScript 오류 | 0 |
| SC 달성률 | 7/7 (100%) |
| Gap Critical | 0 |
| 추가 패키지 | 0 |

---

## 1. 구현 현황

### 1.1 파일 목록

| 파일 | 역할 | 상태 |
|------|------|------|
| `app/api/auth/signup/route.ts` | FastAPI 프록시, `role: 'guardian'` 고정 주입 | ✅ |
| `src/features/auth-signup/api/signup.ts` | fetch wrapper, 에러 파싱 | ✅ |
| `src/features/auth-signup/model/useSignup.ts` | 상태 훅, router.push('/login') | ✅ |
| `src/features/auth-signup/ui/SignupForm.tsx` | 4 필드 + confirmError + server error | ✅ |
| `src/features/auth-signup/index.ts` | FSD Public API | ✅ |
| `app/signup/page.tsx` | Server Component shell + metadata | ✅ |
| `app/signup/layout.tsx` | 인증 전용 레이아웃 | ✅ |
| `app/login/page.tsx` | 회원가입 링크 추가 (수정) | ✅ |

### 1.2 아키텍처 흐름

```
Browser                    Next.js (Server)           FastAPI
   |                            |                        |
   | POST /api/auth/signup      |                        |
   | { name, email, password }  |                        |
   |--------------------------->|                        |
   |                            | POST /api/v1/auth/     |
   |                            | { ..., role:'guardian'}|
   |                            |----------------------->|
   |                            |       201 Created      |
   |                            |<-----------------------|
   | { ok: true }, 201          |                        |
   |<---------------------------|                        |
   | router.push('/login')      |                        |
```

---

## 2. Key Decisions & Outcomes

| 결정 | 출처 | 결과 |
|------|------|------|
| Option C Pragmatic (auth-login mirror) | Design | ✅ 새 패키지 없이 동일 구조로 구현 |
| role 서버 고정 주입 | Plan/Design | ✅ 클라이언트에서 role 전달 불가 |
| FSD features layer 독립 | CLAUDE.md | ✅ auth-login 미참조 |
| 직접 fetch (shared/api 미사용) | Design §6 | ✅ AuthUser 불필요, cookie 없음 |
| passwordConfirm 프론트엔드 전용 검증 | Design §5 | ✅ FastAPI 불필요 호출 없음 |

---

## 3. Success Criteria 최종

| SC | 기준 | 상태 | 근거 |
|----|------|------|------|
| SC-01 | `/signup` 페이지 렌더링 | ✅ Met | `app/signup/page.tsx` |
| SC-02 | passwordConfirm 불일치 → 인라인 에러, 제출 차단 | ✅ Met | `SignupForm.tsx:20-23` |
| SC-03 | 정상 가입 → 201 → `/login` 리디렉션 | ✅ Met | `useSignup.ts:22` |
| SC-04 | 이메일 중복 → 서버 에러 인라인 표시 | ✅ Met | `signup.ts:22` + `SignupForm.tsx:95-98` |
| SC-05 | `role: 'guardian'` 서버 고정 주입 | ✅ Met | `route.ts:12` |
| SC-06 | 로그인 페이지 회원가입 링크 | ✅ Met | `app/login/page.tsx:19-25` |
| SC-07 | `pnpm tsc --noEmit` 에러 없음 | ✅ Met | 검증 완료 |

**Overall Success Rate**: 7/7 (100%)

---

## 4. Gap 분석 결과

| # | 심각도 | 항목 | 처리 |
|---|--------|------|------|
| G-01 | Low | `useSignup.ts` `'use client'` 중복 (기능 무영향) | 허용 |

Critical/Important gap: 없음

---

## 5. 범위 밖 (Out of Scope)

- 이메일 인증 (verification link)
- caregiver/admin 초대 가입
- 비밀번호 강도 표시
- FastAPI `/api/v1/auth/signup` 백엔드 구현 (별도 repo)

---

## 6. 다음 단계

- FastAPI 백엔드 `POST /api/v1/auth/signup` 구현 후 E2E 테스트
- `pnpm dev`로 `/signup` → 가입 → `/login` 흐름 수동 검증
- 필요 시 `/pdca archive auth-signup`
