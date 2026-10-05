# [Plan] role-pages

> 역할별 메뉴 서브 페이지 구현 + 대시보드 그래프 추가

**작성일**: 2026-10-05
**상태**: Plan 완료

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | nav-config에 정의된 9개 서브 메뉴 링크가 404. 대시보드 페이지에 데이터 시각화 없어 앱 완성도 낮음 |
| **Solution** | 역할별 서브 페이지 9개 신규 생성 (Read-only). 각 대시보드에 Recharts 그래프 추가 |
| **Function UX Effect** | 사이드바 메뉴 클릭 시 실제 콘텐츠 표시. 대시보드에서 핵심 지표를 시각적으로 파악 가능 |
| **Core Value** | guardian/caregiver/admin 3개 역할이 자신의 업무 맥락에 맞는 데이터를 메뉴별로 분리해서 조회 |

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 사이드바 메뉴를 클릭하면 404 — 앱이 완성되지 않은 느낌. 대시보드에 숫자만 있어 현황 파악 어려움 |
| **WHO** | 로그인한 guardian/caregiver/admin 모든 사용자 |
| **RISK** | FastAPI 백엔드 미연결 → 차트/목록 데이터 mock 활용. 기존 page.tsx 리디자인 시 기존 기능 보존 필요 |
| **SUCCESS** | 모든 메뉴 링크 접근 가능, 각 대시보드에 그래프 표시, tsc 통과 |
| **SCOPE** | 대시보드 3개 수정 + 서브 페이지 9개 신규. CRUD 없음(Read-only). Recharts 설치 필요 |

---

## 1. 배경

app-header에서 AppShell + nav-config를 완성했지만 실제 메뉴 링크 대상 페이지가 없음:

**404 발생 경로:**
- `/guardian/records`, `/guardian/schedules`, `/guardian/caregivers`
- `/caregiver/schedules`, `/caregiver/records`, `/caregiver/seniors`
- `/admin/users`, `/admin/schedules`, `/admin/seniors`

**대시보드 현황:**
- `guardian/page.tsx`: 어르신 카드 목록만 표시 (그래프 없음)
- `caregiver/page.tsx`: 오늘 방문 일정 + 어르신 목록 (그래프 없음)
- `admin/page.tsx`: 사용자/어르신/일정 테이블 3개 (그래프 없음, 서브 페이지로 분리 필요)

---

## 2. 아키텍처

```
app/
  guardian/
    page.tsx              ← 수정: 그래프 + 요약 대시보드
    records/page.tsx      ← 신규: 건강기록 조회
    schedules/page.tsx    ← 신규: 방문일정 목록
    caregivers/page.tsx   ← 신규: 케어기버 목록

  caregiver/
    page.tsx              ← 수정: 그래프 + 오늘 방문 요약
    schedules/page.tsx    ← 신규: 오늘 방문 일정
    records/page.tsx      ← 신규: 건강기록 입력 (Read-only 목록)
    seniors/page.tsx      ← 신규: 담당 어르신 목록

  admin/
    page.tsx              ← 수정: 그래프 + 요약 카드
    users/page.tsx        ← 신규: 회원 관리 (기존 UserTable 이동)
    schedules/page.tsx    ← 신규: 일정 관리 (기존 ScheduleTable 이동)
    seniors/page.tsx      ← 신규: 어르신 관리 (기존 SeniorTable 이동)
```

**차트 데이터 전략:**
- FastAPI 미연결 → 각 fetch 함수 결과를 집계/가공하여 차트 데이터 생성
- guardian: `fetchSeniors()`가 반환하는 데이터 기반 mock LineChart (상수 데이터)
- caregiver: `fetchCaregiverSchedules()` 상태별 집계 → BarChart
- admin: `fetchAdminUsers()` role별 count → PieChart

---

## 3. 요구사항

### R-01: Recharts 설치
```bash
pnpm add recharts
```

### R-02: guardian 대시보드 리디자인 (`app/guardian/page.tsx`)

- 상단: **건강지표 추이 LineChart** (mock data — 일자별 혈압/혈당)
- 하단: 담당 어르신 목록 (기존 유지, 간소화)

```typescript
// mock 데이터 (백엔드 연동 전)
const healthTrend = [
  { date: "9/29", systolic: 128, diastolic: 82 },
  { date: "9/30", systolic: 132, diastolic: 85 },
  { date: "10/1", systolic: 125, diastolic: 80 },
  ...
]
```

### R-03: caregiver 대시보드 리디자인 (`app/caregiver/page.tsx`)

- 상단: **방문 완료율 BarChart** — fetchCaregiverSchedules() 결과를 status별 집계
  - 상태: "scheduled" | "completed" | "cancelled"
- 하단: 오늘 방문 일정 요약 카드

### R-04: admin 대시보드 리디자인 (`app/admin/page.tsx`)

- 상단: **역할별 회원수 PieChart** — fetchAdminUsers() role별 count
- 상단 우측: 요약 카드 (전체 어르신 수, 오늘 방문 일정 수)
- 하단: 최근 등록 사용자 5명 리스트 (전체 목록은 /admin/users)

### R-05: guardian 서브 페이지 3개

| 경로 | 컴포넌트 | 데이터 |
|------|----------|--------|
| `/guardian/records` | 건강기록 조회 페이지 | fetchSeniors() 기반 목록 + 기록 없음 안내 |
| `/guardian/schedules` | 방문일정 목록 | fetchCaregiverSchedules() 활용 |
| `/guardian/caregivers` | 케어기버 목록 | fetchAdminUsers()에서 caregiver 필터 |

### R-06: caregiver 서브 페이지 3개

| 경로 | 컴포넌트 | 데이터 |
|------|----------|--------|
| `/caregiver/schedules` | 오늘 방문 일정 | fetchCaregiverSchedules() |
| `/caregiver/records` | 건강기록 입력/목록 | Read-only 목록 (입력 form은 다음 iteration) |
| `/caregiver/seniors` | 담당 어르신 목록 | fetchSeniors() |

### R-07: admin 서브 페이지 3개

| 경로 | 컴포넌트 | 데이터 |
|------|----------|--------|
| `/admin/users` | 회원 관리 | fetchAdminUsers() + UserTable (기존 admin/page.tsx에서 이동) |
| `/admin/schedules` | 일정 관리 | fetchAllSchedules() + ScheduleTable (기존에서 이동) |
| `/admin/seniors` | 어르신 관리 | fetchSeniors() + SeniorTable (기존에서 이동) |

---

## 4. 파일 계획

**신규 (9개):**
```
app/guardian/records/page.tsx
app/guardian/schedules/page.tsx
app/guardian/caregivers/page.tsx
app/caregiver/schedules/page.tsx
app/caregiver/records/page.tsx
app/caregiver/seniors/page.tsx
app/admin/users/page.tsx
app/admin/schedules/page.tsx
app/admin/seniors/page.tsx
```

**수정 (3개):**
```
app/guardian/page.tsx     — 그래프 + 대시보드 리디자인
app/caregiver/page.tsx    — 그래프 + 대시보드 리디자인
app/admin/page.tsx        — 그래프 + 요약 카드, 테이블은 서브 페이지로 이동
```

---

## 5. 성공 기준

| # | 기준 | 검증 방법 |
|---|------|----------|
| SC-01 | guardian 대시보드 LineChart 렌더링 | 브라우저에서 그래프 표시 확인 |
| SC-02 | caregiver 대시보드 BarChart 렌더링 | 브라우저에서 그래프 표시 확인 |
| SC-03 | admin 대시보드 PieChart 렌더링 | 브라우저에서 그래프 표시 확인 |
| SC-04 | 9개 서브 페이지 404 없음 | 각 경로 접근 확인 |
| SC-05 | 서브 페이지에 해당 데이터 목록 표시 | 테이블/카드 렌더링 확인 |
| SC-06 | admin/page.tsx 기존 테이블 서브 페이지로 이동 | 대시보드 단순화 확인 |
| SC-07 | `pnpm tsc --noEmit` 에러 없음 | TypeScript 검증 |

---

## 6. 리스크

| 리스크 | 심각도 | 대응 |
|--------|--------|------|
| Recharts SSR 이슈 (Next.js Server Component에서 사용 불가) | 중 | 차트 컴포넌트에 `"use client"` 적용 |
| fetchSeniors/fetchAdminUsers 실제 API 미연결 | 중 | 빈 배열 fallback → 빈 상태 UI 표시 |
| admin/page.tsx 테이블 이동 시 caregivers 필터 로직 중복 | 저 | admin/schedules/page.tsx에 caregivers fetch 추가 |

---

## 7. 범위 밖

- CRUD 기능 (생성/수정/삭제) — 다음 iteration
- 건강기록 실제 입력 form
- 차트 데이터 실시간 연동 (FastAPI 연결 후)
- 페이지네이션

---

## 8. 다음 단계

- `/pdca design role-pages`
