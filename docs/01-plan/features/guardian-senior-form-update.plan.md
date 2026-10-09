# [Plan] guardian-senior-form-update

> 보호자 등록 폼에 어르신 이름 추가 + 어르신 등록 주소 필수화

**작성일**: 2026-10-09
**상태**: Plan 완료

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 보호자 등록 시 어르신 이름 입력란 없음 → 누구를 돌볼 보호자인지 식별 불가. 어르신 등록 시 주소가 선택 → 방문 케어 서비스에 필수인 주소가 누락될 수 있음 |
| **Solution** | GuardianRegisterModal에 `senior_name` 필드 추가, SeniorTable 등록 폼에 주소 필수 검증 추가 |
| **Function UX Effect** | 보호자 등록 시 담당 어르신 연결 정보 확보. 어르신 등록 시 주소 누락 방지 |
| **Core Value** | 데이터 완결성 — 방문 케어 서비스 운영에 필요한 핵심 정보 보장 |

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 보호자-어르신 연결 정보 누락 + 주소 없는 어르신 등록으로 방문 케어 배정 불가 |
| **WHO** | admin 역할 — 보호자/어르신 등록하는 관리자 |
| **RISK** | `senior_name`을 FastAPI가 받는지 schema 확인 필요 / `SeniorCreate.address`가 optional 타입이면 필수화는 FE 검증만 |
| **SUCCESS** | 보호자 폼에 어르신 이름 필드 노출 + 어르신 등록 시 주소 미입력 시 에러 메시지 |
| **SCOPE** | GuardianRegisterModal.tsx + createUser.ts 타입 + SeniorTable.tsx. 백엔드 schema 변경 없음 |

---

## 1. 현재 상태

### 1.1 보호자 등록 (`GuardianRegisterModal.tsx`)

현재 필드: 이름, 아이디, 비밀번호, 전화번호, 관계, 주소, 비상연락처, 가족관계증명서

**누락**: `senior_name` (담당 어르신 이름) 없음

### 1.2 어르신 등록 (`SeniorTable.tsx`)

현재 `handleCreate` 필수 검증:
```typescript
if (!addForm.full_name || !addForm.birth_date || !addForm.gender) {
  setError("이름, 생년월일, 성별은 필수입니다.");
  return;
}
```

주소 placeholder: `"주소 (선택)"` → **필수 아님**

---

## 2. 요구사항

### R-01: `GuardianRegisterModal.tsx` — `senior_name` 필드 추가

- `GuardianFormValues` 인터페이스에 `senior_name: string` 추가 (필수)
- 폼에 "담당 어르신 이름 *" 입력 필드 추가 (관계 필드 위)
- `mutation.mutationFn`에서 `createUser` 호출 시 `senior_name` 포함

### R-02: `createUser.ts` — `GuardianFields`에 `senior_name` 추가

- `GuardianFields` 인터페이스에 `senior_name: string` 추가

### R-03: `SeniorTable.tsx` — 주소 필수 검증

- `handleCreate` 검증 조건에 `!addForm.address` 추가
- 에러 메시지: `"이름, 생년월일, 성별, 주소는 필수입니다."`
- 주소 input placeholder: `"주소 (선택)"` → `"주소 *"`
- 수정 폼(editForm)의 주소 placeholder도 동일하게 변경

---

## 3. 파일 계획

```
수정:
src/features/admin-dashboard/ui/GuardianRegisterModal.tsx  ← R-01
src/features/admin-dashboard/api/createUser.ts             ← R-02
src/features/admin-dashboard/ui/SeniorTable.tsx            ← R-03

변경 없음:
app/api/admin/users/route.ts   (body 그대로 FastAPI 전달)
src/shared/api/schema.d.ts     (FastAPI schema 변경 없음)
```

---

## 4. 성공 기준

| # | 기준 | 검증 |
|---|------|------|
| SC-01 | 보호자 등록 폼에 "담당 어르신 이름 *" 필드 노출 | UI 확인 |
| SC-02 | 어르신 이름 미입력 시 폼 제출 차단 + 에러 메시지 | 폼 동작 확인 |
| SC-03 | 어르신 등록 시 주소 미입력 시 에러 메시지 노출 | UI 확인 |
| SC-04 | `pnpm tsc --noEmit` 에러 없음 | TypeScript 검증 |

---

## 5. 리스크

| 리스크 | 심각도 | 대응 |
|--------|--------|------|
| FastAPI `senior_name` 필드 미지원 | 중 | FE에서 필드 수집만, 백엔드 연동은 추후 확인 |
| `SeniorCreate.address` 타입이 optional → tsc 에러 가능 | 저 | FE 검증만 추가, 타입은 그대로 유지 |

---

## 6. 다음 단계

- `/pdca design guardian-senior-form-update`
