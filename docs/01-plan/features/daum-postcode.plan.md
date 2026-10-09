# [Plan] daum-postcode

> 주소 입력 필드를 react-daum-postcode 우편번호 검색으로 교체

**작성일**: 2026-10-09
**상태**: Plan 완료

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 주소를 자유 텍스트로 입력 → 오타·비표준 주소 저장 가능, 방문 케어 배정 시 주소 파싱 실패 위험 |
| **Solution** | `react-daum-postcode` 팝업으로 표준 도로명 주소 선택 + 상세주소 직접 입력 |
| **Function UX Effect** | 버튼 클릭 → 다음 주소 검색 팝업 → 선택 시 기본주소 자동 입력 + 상세주소만 직접 입력 |
| **Core Value** | 표준 주소 데이터 확보 — 오입력 방지, 방문 케어 배정 정확도 향상 |

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 자유 텍스트 주소 → 표준화 실패 → 방문 케어 배정 오류 |
| **WHO** | admin — 보호자/어르신 등록하는 관리자 |
| **RISK** | SeniorTable 인라인 폼에서 팝업 z-index 충돌 가능 / react-daum-postcode 타입 정의 확인 필요 |
| **SUCCESS** | 주소 필드 클릭 시 다음 팝업 열림 + 선택 후 도로명 주소 자동 입력 |
| **SCOPE** | AddressField 공유 컴포넌트 신규 + GuardianRegisterModal + SeniorTable. CaregiverRegisterModal 변경 없음 |

---

## 1. 현재 상태

| 파일 | 현재 주소 입력 방식 |
|------|-------------------|
| `GuardianRegisterModal.tsx` | `<input {...register("address")} />` (선택, 자유 텍스트) |
| `SeniorTable.tsx` | `<input placeholder="주소 *" value={addForm.address} />` (인라인, 자유 텍스트) |

---

## 2. 요구사항

### R-01: `pnpm add react-daum-postcode`

패키지 설치. `@types/react-daum-postcode`는 번들 포함이라 별도 설치 불필요.

### R-02: `src/shared/ui/AddressField.tsx` — 공유 컴포넌트 신규

```
[주소 검색] 버튼
기본주소 (read-only input, DaumPostcode 결과)
상세주소 (직접 입력 input)
```

Props:
```typescript
interface AddressFieldProps {
  value: string;           // 전체 주소 (기본주소 + 상세주소 조합)
  onChange: (address: string) => void;
  required?: boolean;
  error?: string;
}
```

내부 동작:
- "주소 검색" 버튼 클릭 → DaumPostcode 팝업 오버레이 표시
- `onComplete(data)` → `roadAddress` (또는 `jibunAddress`) → 기본주소 상태 저장
- 상세주소 입력 시 `onChange(기본주소 + " " + 상세주소)` 호출
- 팝업은 `fixed inset-0 z-[100]` 오버레이로 표시 (모달 위에 뜨도록)

### R-03: `GuardianRegisterModal.tsx` — AddressField 적용

- 기존 `<input {...register("address")} />` 제거
- `useForm`의 `watch("address")` + `setValue("address", ...)` 패턴으로 연결
- `AddressField` 컴포넌트로 교체

### R-04: `SeniorTable.tsx` — AddressField 적용

- 기존 `<input placeholder="주소 *" ... />` 제거
- `addForm.address` state를 `AddressField`의 `value` + `onChange`로 연결
- 수정 폼(editForm)의 주소 input도 동일하게 교체

### R-05: `src/shared/ui/index.ts` — AddressField export

---

## 3. 파일 계획

```
신규:
src/shared/ui/AddressField.tsx          ← R-02

수정:
src/features/admin-dashboard/ui/GuardianRegisterModal.tsx  ← R-03
src/features/admin-dashboard/ui/SeniorTable.tsx            ← R-04
src/shared/ui/index.ts                                     ← R-05
package.json / pnpm-lock.yaml                              ← R-01

변경 없음:
CaregiverRegisterModal.tsx  (주소 필드 없음)
createUser.ts               (타입 변경 없음)
```

---

## 4. UX 흐름

```
[주소 검색] 클릭
  → DaumPostcode 팝업 (z-index: 100)
    → 검색 후 선택
      → roadAddress → 기본주소 input에 자동 입력 (read-only)
      → 상세주소 input focus
        → 사용자 상세주소 입력
          → onChange("서울시 강남구 테헤란로 123 (역삼동) 101호")
```

---

## 5. 성공 기준

| # | 기준 | 검증 |
|---|------|------|
| SC-01 | "주소 검색" 버튼 클릭 시 다음 팝업 표시 | UI 확인 |
| SC-02 | 주소 선택 후 기본주소 자동 입력 | UI 확인 |
| SC-03 | 상세주소 입력 시 전체 주소로 조합 | 값 확인 |
| SC-04 | GuardianRegisterModal에서 정상 동작 | UI 확인 |
| SC-05 | SeniorTable 인라인 폼에서 정상 동작 | UI 확인 |
| SC-06 | `pnpm tsc --noEmit` 에러 없음 | TypeScript 검증 |

---

## 6. 리스크

| 리스크 | 심각도 | 대응 |
|--------|--------|------|
| SeniorTable 인라인 팝업 z-index 충돌 | 중 | `fixed z-[100]` 오버레이 사용 |
| GuardianRegisterModal(z-50) 위에 팝업 | 중 | 팝업 z-index를 z-[100]으로 설정 |
| react-daum-postcode SSR 이슈 | 저 | `"use client"` 명시, dynamic import 불필요 |

---

## 7. 다음 단계

바로 구현 가능 (변경 범위 명확)
