# [Report] admin-user-tabs

> 관리자 회원 관리 페이지 역할별 탭 분리 + 보호자/요양사 등록 모달

**작성일**: 2026-10-09
**상태**: 완료
**Match Rate**: 100%
**SC 달성**: 6/6

---

## 1. Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | `/admin/users` 전체 목록 단일 뷰 — 역할별 관리 불가, 신규 사용자 등록 기능 없음 |
| **Solution** | 보호자/요양사 2탭 분리 + 각 탭에 역할 전용 등록 모달. `UserTable` 기존 코드 재사용 |
| **Function UX Effect** | 탭 전환으로 역할별 목록 확인 → 모달 폼으로 즉시 등록 → `router.refresh()`로 목록 갱신 |
| **Core Value** | 관리자가 검증된 보호자·요양사 계정을 직접 생성. 자가 가입 없이 통제된 사용자만 시스템 진입 |

### 1.2 결과 요약

| 항목 | 계획 | 실제 |
|------|------|------|
| 신규 파일 | 5개 | 5개 |
| 수정 파일 | 2개 | 2개 |
| SC 달성 | 6/6 | 6/6 |
| Match Rate | ≥90% | 100% |
| iteration | - | 1회 (G-2 접근성 수정) |

---

## 2. 주요 의사결정 기록

| 결정 | 선택 | 이유 | 결과 |
|------|------|------|------|
| 아키텍처 | Option B (Feature Slice) | `page.tsx` Server Component 유지, 관심사 분리 | 정확히 준수, tsc 통과 |
| 상태 관리 | UserTabs에서 tab + modal 통합 관리 | 단일 클라이언트 진입점 | 탭 전환 시 모달 자동 닫힘 |
| 모달 분리 | Guardian/Caregiver 별도 파일 | 역할별 필드가 달라 조건부 로직 방지 | 코드 명확성 향상 |
| API 전략 | mock 201 → FastAPI 교체 예정 | 백엔드 미구현 상태에서 UI 완성 | TODO 주석으로 교체 포인트 명시 |
| 파일 업로드 | UI 수집만, 전송 제외 | FastAPI multipart 미지원 | `JSON.stringify` 에서 file 필드 제외 |

---

## 3. Success Criteria 최종 상태

| SC | 기준 | 상태 | 근거 |
|----|------|------|------|
| SC-01 | 보호자/요양사 탭 전환 동작 | ✅ | `UserTabs.tsx:26` — `users.filter(u => u.role === activeTab)` |
| SC-02 | 보호자 등록 모달 오픈/제출 | ✅ | `GuardianRegisterModal.tsx:38` — useMutation + onSuccess router.refresh |
| SC-03 | 요양사 등록 모달 오픈/제출 | ✅ | `CaregiverRegisterModal.tsx:36` — 동일 패턴 |
| SC-04 | 필수 필드 미입력 에러 | ✅ | react-hook-form required — 5개 필수 필드 검증 |
| SC-05 | 파일 필드 UI 표시 | ✅ | `input type="file"` — family_certificate, certificate |
| SC-06 | `pnpm tsc --noEmit` 에러 없음 | ✅ | 2회 검증 통과 |

**SC 달성률: 6/6 (100%)**

---

## 4. 구현 산출물

### 신규 생성

| 파일 | 역할 |
|------|------|
| `app/api/admin/users/route.ts` | mock POST 201 핸들러 |
| `src/features/admin-dashboard/api/createUser.ts` | `CreateUserRequest` 유니온 타입 + fetch |
| `src/features/admin-dashboard/ui/UserTabs.tsx` | 탭 전환 + EmptyState + 모달 조율 |
| `src/features/admin-dashboard/ui/GuardianRegisterModal.tsx` | 보호자 전용 8개 필드 모달 |
| `src/features/admin-dashboard/ui/CaregiverRegisterModal.tsx` | 요양사 전용 7개 필드 모달 |

### 수정

| 파일 | 변경 내용 |
|------|----------|
| `app/admin/users/page.tsx` | `UserTable` → `UserTabs` 교체 |
| `src/features/admin-dashboard/index.ts` | `UserTabs`, `createUser`, 타입 export 추가 |

---

## 5. Gap 이력

| # | 심각도 | 발견 | 처리 |
|---|--------|------|------|
| G-1 | Minor | GuardianRegisterModal stale TODO 주석 | 제거 |
| G-2 | Minor | label htmlFor / input id 쌍 누락 | 양쪽 모달 전체 추가 |

---

## 6. 기술 패턴 학습

| 패턴 | 내용 |
|------|------|
| Server/Client 경계 | `page.tsx` async Server Component → props 전달 → Client Component (`UserTabs`) |
| react-hook-form + useMutation | `handleSubmit` → `mutation.mutate` 패턴. `onSuccess`에서 `reset() + onClose()` |
| 역할별 유니온 타입 | `CreateUserRequest = (Base & Guardian) | (Base & Caregiver)` — TypeScript 판별 유니온 |
| mock → 실 API 교체 전략 | Next.js route.ts mock 201 → FastAPI 연결 시 내부만 교체, 클라이언트 코드 무수정 |

---

## 7. 다음 단계

| 항목 | 조건 |
|------|------|
| FastAPI `/admin/users` POST 연결 | `app/api/admin/users/route.ts` 내부 교체 |
| 파일 업로드 (multipart) | FastAPI multipart 지원 시 `createUser` 확장 |
| 중복 username 에러 처리 | FastAPI 409 응답 → `data.detail` 로 모달 에러 표시 (이미 구현됨) |
