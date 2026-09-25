# [Report] admin-dashboard

> 관리자 대시보드 — Full CRUD + Route Handler 프록시 패턴 완료 보고서

**완료일**: 2026-09-24
**Match Rate**: 100%
**Iteration**: 0회

---

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | admin-dashboard |
| **완료일** | 2026-09-24 |
| **Match Rate** | 100% |
| **생성 파일** | 17개 신규 + 1개 수정 |

### Value Delivered (4 Perspectives)

| 관점 | 결과 |
|------|------|
| **Problem** | 관리자가 사용자 계정·어르신 정보·방문 일정을 한 화면에서 직접 관리할 수 없었음 → 단일 `/admin` 페이지 3섹션 Full CRUD로 완전 해결 |
| **Solution** | guardian(읽기) + caregiver(제한 쓰기) 패턴에 이어 admin(Full CRUD) 완성 — Route Handler 프록시 5개 + Client helper 6개 + Server helper 2개 |
| **Function UX Effect** | 사용자 비활성화 버튼 / 어르신 인라인 CRUD (editingId 패턴) / 일정 드롭다운 생성+인라인 수정+삭제 — 페이지 이동 없이 모든 작업 처리 |
| **Core Value** | guardian·caregiver·admin 3종 대시보드 패턴 완성 — 읽기/제한 쓰기/Full CRUD 역할별 권한 아키텍처 → 포트폴리오 면접 어필 포인트 |

---

## 1. 구현 결과

### 1.1 파일 목록 (18개)

**M1 — Route Handlers (5개 신규)**

| 파일 | HTTP | FastAPI 엔드포인트 |
|------|------|------------------|
| `app/api/admin/users/[userId]/deactivate/route.ts` | PATCH | `/admin/users/{id}/deactivate` |
| `app/api/seniors/route.ts` | POST | `/seniors` |
| `app/api/seniors/[seniorId]/route.ts` | PUT + DELETE | `/seniors/{id}` |
| `app/api/schedules/route.ts` | POST | `/schedules` |
| `app/api/schedules/[scheduleId]/route.ts` | PUT + DELETE | `/schedules/{id}` |

> 기존 `app/api/schedules/[scheduleId]/status/route.ts` (caregiver)와 경로 분리 — 무충돌

**M2+M3 — Feature API (5개 신규)**

| 파일 | 역할 |
|------|------|
| `features/admin-dashboard/api/fetchAdminUsers.ts` | Server: GET /admin/users |
| `features/admin-dashboard/api/fetchAllSchedules.ts` | Server: GET /schedules (전체) |
| `features/admin-dashboard/api/deactivateUser.ts` | Client: PATCH deactivate |
| `features/admin-dashboard/api/seniors.ts` | Client: createSenior/updateSenior/deleteSenior |
| `features/admin-dashboard/api/schedules.ts` | Client: createSchedule/updateSchedule/deleteSchedule |

**M5 — UI Components (3개 신규)**

| 컴포넌트 | 핵심 패턴 |
|----------|----------|
| `UserTable.tsx` | `pendingIds: Set<number>` — 다중 비활성화 동시 처리 |
| `SeniorTable.tsx` | `editingId` + `isLocked` — 인라인 수정 행 단독 제어 |
| `ScheduleTable.tsx` | senior/caregiver dropdown + `editingId` + `isLocked` |

**M6 — App 라우트 (2개 신규 + 1개 수정)**

- `app/admin/page.tsx` — Server Component, Promise.all 3-fetch, caregivers 필터
- `app/admin/loading.tsx` — skeleton UI
- `app/admin/error.tsx` — 'use client' reset

### 1.2 Success Criteria 최종 현황

| SC | 기준 | 결과 |
|----|------|------|
| SC-01 | 목록 렌더링 | ✅ Met |
| SC-02 | 사용자 테이블 role/is_active | ✅ Met |
| SC-03 | 비활성화 → PATCH → 갱신 | ✅ Met |
| SC-04 | 어르신 등록 → POST | ✅ Met |
| SC-05 | 어르신 수정 → PUT | ✅ Met |
| SC-06 | 어르신 삭제 → DELETE | ✅ Met |
| SC-07 | 일정 생성 드롭다운 → POST | ✅ Met |
| SC-08 | 일정 수정 → PUT | ✅ Met |
| SC-09 | 일정 삭제 → DELETE | ✅ Met |
| SC-10 | Authorization 헤더 | ✅ Met |
| SC-11 | 미인증 차단 | ✅ Met |

**Success Rate: 11/11 (100%)**

---

## 2. Key Decisions & Outcomes

| 결정 | 근거 | 결과 |
|------|------|------|
| Option C Pragmatic 아키텍처 | caregiver 패턴 재사용, 파일 수 최적 | 17파일, 일관된 프로젝트 패턴 |
| PUT+DELETE 단일 route.ts | Next.js App Router 표준 | 파일 수 절감, REST 관례 준수 |
| `schedules/[id]/route.ts` 분리 | caregiver `status/route.ts` 충돌 방지 | 경로 독립성 보장 |
| `editingId` + `isLocked` | 동시 편집 방지, UX 명확성 | 수정 중 다른 버튼 비활성화 |
| `senior_id` 수정 불가 | `ScheduleUpdate` 스키마 제약 반영 | 백엔드 계약 그대로 노출 |
| caregivers 사전 필터 | `role=caregiver && is_active`만 드롭다운 표시 | 비활성 요양사 선택 방지 |

---

## 3. 3종 대시보드 패턴 완성

| 대시보드 | 역할 | 패턴 | 파일 수 |
|----------|------|------|---------|
| guardian-dashboard | 보호자 (읽기 전용) | Server Component + Promise.allSettled | 12 |
| caregiver-dashboard | 요양사 (제한 쓰기) | Server Component + Client Component + Route Handler | 10 |
| admin-dashboard | 관리자 (Full CRUD) | Server Component + 3 Client Components + 5 Route Handlers | 17 |

**Milestone 4 프론트 대시보드 3종 연동 완료.**

---

## 4. 면접 어필 포인트

1. **역할별 권한 아키텍처**: guardian(GET only) → caregiver(GET + 제한 PATCH/POST) → admin(Full CRUD) — 3계층 권한 분리를 코드 구조로 표현
2. **Route Handler 프록시 패턴 일관성**: 인증 토큰을 서버 사이드에서만 처리, 클라이언트에 토큰 노출 없음
3. **`editingId` 인라인 CRUD 패턴**: 페이지 이동 없이 모든 수정 작업 처리, `isLocked`로 동시 편집 방지
4. **openapi-typescript 스키마 직접 참조**: `SeniorCreate`, `ScheduleUpdate` 등 백엔드 스키마 변경 시 자동 반영
