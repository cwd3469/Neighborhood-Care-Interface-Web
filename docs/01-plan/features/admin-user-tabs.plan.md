# [Plan] admin-user-tabs

> 관리자 회원 관리 페이지를 역할별 탭으로 분리 + 보호자/요양사 등록 모달 추가

**작성일**: 2026-10-05
**상태**: Plan 완료

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | `/admin/users`가 전체 목록 단일 뷰 + 비활성화만 가능. 역할별 관리 불가, 신규 사용자 등록 기능 없음 |
| **Solution** | 보호자/요양사 2탭 분리 + 각 탭에 "+ 등록" 모달 추가. 역할별 전용 필드 수집 |
| **Function UX Effect** | 관리자가 탭 전환으로 역할별 목록 확인, 모달에서 역할에 맞는 정보를 입력하여 즉시 등록 |
| **Core Value** | 관리자가 직접 보호자·요양사 계정을 생성·관리. 자가 가입 없이 검증된 사용자만 시스템 진입 |

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 현재 신규 사용자는 자가 가입만 가능. 관리자가 검증 후 직접 등록하는 플로우 필요 |
| **WHO** | admin 역할 사용자 |
| **RISK** | FastAPI 파일 업로드 미지원 → 파일 필드는 UI만 구현. admin create user API 없으면 signup API 재활용 |
| **SUCCESS** | 탭 전환 동작, 모달 폼 제출 성공, tsc 통과 |
| **SCOPE** | admin/users 페이지 수정 + 탭 컴포넌트 + 등록 모달 2종. CRUD 중 Create + 기존 Read/Deactivate 유지 |

---

## 1. 배경

현재 `/admin/users`:
- `UserTable` 단일 컴포넌트로 전체 역할 혼합 표시
- 신규 사용자 등록 UI 없음 → 사용자가 직접 `/signup`으로 가입
- 요양사/보호자 전용 추가 정보(면허번호, 관계 등) 수집 불가

---

## 2. 탭 구성

```
/admin/users
  ├── [보호자] 탭  — guardian 목록 + 보호자 등록 모달
  └── [요양사] 탭  — caregiver 목록 + 요양사 등록 모달
```

- 관리자(admin) 계정은 기존 전체 목록에서 유지 (탭 밖)
- URL 상태 불필요 (탭 상태는 클라이언트 state)

---

## 3. 요구사항

### R-01: 탭 UI

- "보호자" / "요양사" 탭 버튼
- 활성 탭 강조 (border-bottom or bg)
- 탭 전환 시 해당 역할 목록 표시 (기존 UserTable 역할 필터링)

### R-02: "+ 등록" 버튼

- 각 탭 우측 상단에 "+ 보호자 등록" / "+ 요양사 등록" 버튼
- 클릭 시 역할별 모달 오픈

### R-03: 보호자 등록 모달 (GuardianRegisterModal)

**공통 필드:**
| 필드 | 타입 | 필수 |
|------|------|------|
| 이름 (full_name) | text | ✅ |
| 아이디 (username) | text | ✅ |
| 비밀번호 (password) | password | ✅ |
| 전화번호 (phone) | tel | - |

**보호자 전용 필드:**
| 필드 | 타입 | 필수 |
|------|------|------|
| 피보호자와의 관계 (relationship) | select | ✅ |
| 주소 (address) | text | - |
| 비상연락처 (emergency_contact) | tel | - |
| 가족관계증명서 (family_certificate) | file | - |

> 관계 옵션: 자녀, 배우자, 형제/자매, 부모, 기타

### R-04: 요양사 등록 모달 (CaregiverRegisterModal)

**공통 필드:** (R-03과 동일)

**요양사 전용 필드:**
| 필드 | 타입 | 필수 |
|------|------|------|
| 요양사 면허번호 (license_number) | text | ✅ |
| 자격증 파일 (certificate) | file | - |
| 경력 연수 (experience_years) | number | - |

### R-05: 등록 API

- `POST /api/admin/users` — admin 전용 신규 사용자 생성 route 추가
- Request body: `{ role, username, password, full_name, phone?, ...role_specific }`
- FastAPI 연결 전: Next.js route에서 mock 응답 (201 반환)
- 파일 업로드: UI 수집만, 실제 전송은 FastAPI 연결 후

### R-06: 등록 후 처리

- 성공: 모달 닫기 + 목록 새로고침 (`router.refresh()`)
- 실패: 모달 내 에러 메시지 표시

---

## 4. 파일 계획

**신규:**
```
app/api/admin/users/route.ts              ← POST (admin 사용자 생성)
src/features/admin-dashboard/ui/UserTabs.tsx           ← 탭 + 필터 컨테이너
src/features/admin-dashboard/ui/GuardianRegisterModal.tsx
src/features/admin-dashboard/ui/CaregiverRegisterModal.tsx
src/features/admin-dashboard/api/createUser.ts         ← POST /api/admin/users 호출
```

**수정:**
```
app/admin/users/page.tsx                  ← UserTable → UserTabs로 교체
src/features/admin-dashboard/index.ts    ← UserTabs export 추가
```

---

## 5. 성공 기준

| # | 기준 | 검증 |
|---|------|------|
| SC-01 | 보호자/요양사 탭 전환 동작 | 클릭 시 해당 역할 목록 표시 |
| SC-02 | 보호자 등록 모달 오픈/제출 | 폼 입력 후 제출 → 목록 갱신 |
| SC-03 | 요양사 등록 모달 오픈/제출 | 폼 입력 후 제출 → 목록 갱신 |
| SC-04 | 필수 필드 미입력 시 에러 표시 | react-hook-form validation |
| SC-05 | 파일 필드 UI 표시 | input type="file" 렌더링 |
| SC-06 | `pnpm tsc --noEmit` 에러 없음 | TypeScript 검증 |

---

## 6. 리스크

| 리스크 | 대응 |
|--------|------|
| FastAPI admin create user API 미구현 | Next.js route mock (201) → 실 연동 시 교체 |
| 파일 업로드 백엔드 미지원 | UI 수집만, multipart 전송은 scope 밖 |
| UserTable 역할 필터링 시 빈 목록 | 빈 상태 UI ("등록된 보호자가 없습니다") 추가 |

---

## 7. 범위 밖

- 수정(Edit) 기능
- 파일 실제 업로드 (FastAPI 연결 후)
- 페이지네이션
- 검색/필터

---

## 8. 다음 단계

- `/pdca design admin-user-tabs`
