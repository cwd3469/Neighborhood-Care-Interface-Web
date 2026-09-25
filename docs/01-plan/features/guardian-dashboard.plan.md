# [Plan] guardian-dashboard

> 보호자 대시보드 — 담당 어르신 목록 + 개별 어르신 상세(활력징후·방문 일정·방문 기록)

**작성일**: 2026-09-23
**상태**: Plan 완료

---

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | guardian-dashboard |
| **Milestone** | 4 — 프론트 대시보드 3종 연동 (첫 번째) |
| **관련 엔드포인트** | GET /seniors, /schedules, /records, /vitals/seniors/{id} |

### Value Delivered (4 Perspectives)

| 관점 | 내용 |
|------|------|
| **Problem** | 보호자가 담당 어르신의 건강·일정 현황을 확인할 창구가 없음 |
| **Solution** | Server Component + getServerApiHeaders()로 FastAPI 직접 조회, 어르신 목록 → 상세 2단 구조 |
| **Function UX Effect** | `/guardian` 진입 시 담당 어르신 카드 목록 → 클릭 → `/guardian/[seniorId]` 활력징후·일정·기록 한눈에 |
| **Core Value** | Next.js Server Component RSC 데이터 fetch 패턴 + FHIR Observation 기반 헬스케어 데이터 표시 실무 경험 |

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | Milestone 4 첫 번째 — 보호자 역할 대시보드 없으면 전체 서비스 미완성 |
| **WHO** | 프론트 5년차 — App Router Server Component, FSD 숙지, FHIR 문진 경험 보유 |
| **RISK** | `ScheduleResponse`에 caregiver 이름 없음(ID만) → API 제약 사항; `fhir_response` JSONB 파싱 범위 결정 필요 |
| **SUCCESS** | `/guardian` → 어르신 목록 → 클릭 → 활력징후·방문 일정·방문 기록 실데이터 표시 |
| **SCOPE** | 보호자 대시보드(읽기 전용) — caregiver/admin 대시보드는 별도 feature |

---

## 1. 요구사항

### 1.1 기능 요구사항

| # | 요구사항 | 우선순위 |
|---|----------|----------|
| R-01 | `/guardian` 진입 시 담당 어르신 카드 목록 표시 | Must |
| R-02 | 어르신 카드 클릭 → `/guardian/[seniorId]` 상세 페이지 | Must |
| R-03 | 상세 페이지: 어르신 기본 정보 (이름, 생년월일, 성별, 주소) | Must |
| R-04 | 상세 페이지: 활력징후 최근 5건 (loinc_code, display_name, value, unit, observed_at) | Must |
| R-05 | 상세 페이지: 방문 일정 목록 (scheduled_date, start_time, end_time, status, caregiver_id) | Must |
| R-06 | 상세 페이지: 방문 기록 최근 목록 (recorded_at, visit_notes) | Must |
| R-07 | 모든 데이터 fetch는 Server Component에서 `getServerApiHeaders()` 사용 | Must |
| R-08 | 인증 없는 접근 차단 — `proxy.ts`가 이미 처리, 추가 코드 불필요 | Must |

### 1.2 비기능 요구사항

| # | 요구사항 |
|---|----------|
| NF-01 | Server Component로 구현 — 'use client' 없이 초기 데이터 로드 |
| NF-02 | 로딩 상태: `loading.tsx` / Suspense fallback |
| NF-03 | API 오류 시 `error.tsx` fallback |
| NF-04 | FSD 구조 준수 — `src/features/guardian-dashboard/` + `src/entities/senior/` |

### 1.3 Known Constraints (API 제약)

| 제약 | 내용 | 대응 |
|------|------|------|
| 요양사 이름 없음 | `ScheduleResponse.caregiver_id`는 숫자 ID만 제공. `/admin/users`는 admin 전용으로 보호자 접근 불가 | `caregiver_id` 숫자 표시 + TODO 주석. 백엔드에서 ScheduleResponse에 `caregiver_name` 필드 추가 요청 필요 |
| `fhir_response` 파싱 | `VisitRecordResponse.fhir_response`는 raw FHIR JSONB | `visit_notes` 텍스트만 표시 (Q4 결정) |

---

## 2. API 매핑

| 화면 | 엔드포인트 | 응답 타입 | 비고 |
|------|-----------|-----------|------|
| 어르신 목록 | `GET /seniors` | `SeniorResponse[]` | JWT 기준 담당 어르신만 반환 (백엔드 필터) |
| 어르신 상세 | `GET /seniors/{senior_id}` | `SeniorResponse` | |
| 방문 일정 | `GET /schedules?senior_id={id}` | `ScheduleResponse[]` | `status === 'scheduled'` 프론트 필터 |
| 방문 기록 | `GET /records?senior_id={id}` | `VisitRecordResponse[]` | `visit_notes` 표시 |
| 활력징후 | `GET /vitals/seniors/{id}?limit=5` | `VitalObservationResponse[]` | 최근 5건 |

---

## 3. 화면 구조

```
/guardian                          ← 어르신 목록 페이지
  └─ SeniorCard × N                 ← 이름, 생년월일, 성별

/guardian/[seniorId]               ← 어르신 상세 대시보드
  ├─ SeniorInfoPanel               ← 기본 정보 (이름/생년월일/성별/주소/medical_notes)
  ├─ VitalsPanel                   ← 활력징후 최근 5건 테이블
  ├─ ScheduleList                  ← 예정 방문 일정 (status=scheduled)
  └─ VisitRecordList               ← 최근 방문 기록 (visit_notes)
```

---

## 4. 라우트 및 파일 계획

```
app/guardian/
  page.tsx                         ← 어르신 목록 (Server Component)
  loading.tsx                      ← Suspense fallback
  error.tsx                        ← 오류 처리
  [seniorId]/
    page.tsx                       ← 어르신 상세 대시보드 (Server Component)
    loading.tsx
    error.tsx

src/
  entities/senior/
    model/types.ts                 ← SeniorResponse 타입 (schema.d.ts에서 참조)
    api/index.ts                   ← fetchSeniors, fetchSenior
    index.ts                       ← public API
  features/guardian-dashboard/
    api/
      schedules.ts                 ← fetchSchedules(seniorId)
      records.ts                   ← fetchRecords(seniorId)
      vitals.ts                    ← fetchVitals(seniorId)
    ui/
      SeniorCard.tsx               ← 어르신 카드 컴포넌트
      SeniorInfoPanel.tsx          ← 기본 정보 패널
      VitalsPanel.tsx              ← 활력징후 테이블
      ScheduleList.tsx             ← 방문 일정 목록
      VisitRecordList.tsx          ← 방문 기록 목록
    index.ts                       ← public API
```

---

## 5. Success Criteria

| # | 기준 | 검증 방법 |
|---|------|----------|
| SC-01 | `/guardian` 접근 시 담당 어르신 카드 목록 렌더링 | 화면 확인 |
| SC-02 | 어르신 카드 클릭 → `/guardian/[seniorId]` 이동 | 네비게이션 확인 |
| SC-03 | 상세 페이지에서 SeniorResponse 기본 정보 표시 | 화면 확인 |
| SC-04 | VitalsPanel: `VitalObservationResponse` 최근 5건 표시 | 화면 확인 |
| SC-05 | ScheduleList: `status === 'scheduled'` 일정 표시 (caregiver_id 포함) | 화면 확인 |
| SC-06 | VisitRecordList: `visit_notes` 텍스트 표시 | 화면 확인 |
| SC-07 | 모든 fetch에서 `Authorization: Bearer {token}` 헤더 전송 | Network 탭 확인 |
| SC-08 | 미인증 접근 → `/login` 리디렉션 (proxy.ts) | 직접 URL 접근 테스트 |

---

## 6. 리스크

| # | 리스크 | 심각도 | 대응 |
|---|--------|--------|------|
| R-01 | 어르신 0명인 보호자 계정 | Medium | 빈 상태 UI (empty state) 처리 |
| R-02 | `/vitals/seniors/{id}` 데이터 없음 | Low | 빈 테이블 + "기록 없음" 메시지 |
| R-03 | 병렬 fetch 중 일부 실패 | Medium | `Promise.allSettled` 사용, 부분 오류 허용 |
| R-04 | caregiver 이름 미표시 | Low | TODO 주석으로 명시, 백엔드 추가 요청 |

---

## 7. 다음 단계

- `/pdca design guardian-dashboard` — 3가지 아키텍처 옵션 비교
- 이후: caregiver-dashboard, admin-dashboard
