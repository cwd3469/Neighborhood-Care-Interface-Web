# [Report] guardian-dashboard

> 보호자 대시보드 — Server Component + FSD + Promise.allSettled 패턴 완료 보고서

**완료일**: 2026-09-23
**Match Rate**: 100%
**Iteration**: 0회

---

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | guardian-dashboard |
| **완료일** | 2026-09-23 |
| **Match Rate** | 100% |
| **생성 파일** | 12개 신규 + 1개 수정 |

### Value Delivered (4 Perspectives)

| 관점 | 결과 |
|------|------|
| **Problem** | 보호자가 담당 어르신의 건강·일정 현황을 확인할 창구 없음 → 완전한 대시보드 구현 |
| **Solution** | Server Component + `getServerApiHeaders()` → FastAPI 직접 조회, `Promise.allSettled` 병렬 fetch, 어르신 목록/상세 2단 구조 |
| **Function UX Effect** | `/guardian` → 어르신 카드 목록 → 클릭 → `/guardian/[seniorId]` 활력징후·방문 일정·방문 기록 한눈에 표시 |
| **Core Value** | Next.js Server Component RSC 데이터 fetch 패턴 + `openapi-typescript` 스키마 직접 참조 + FHIR Observation 기반 헬스케어 데이터 — 면접 어필 포인트 |

---

## Key Decisions & Outcomes

| 결정 | 결과 |
|------|------|
| Option C Pragmatic 아키텍처 | `entities/senior` 분리(재사용 가능) + 나머지 feature 내 유지(YAGNI) — FSD 준수, 파일 수 적정 |
| `schema.d.ts` 직접 타입 참조 | `type alias`만 사용, 재정의 없음 → 백엔드 스키마 변경 자동 반영 |
| `Promise.allSettled` 병렬 fetch | senior fetch 실패 → `notFound()`, 나머지(schedules/records/vitals) 실패 → 빈 배열 → UX 저하 최소화 |
| `isNaN(id)` 명시적 가드 | `Number('invalid')` → NaN → 즉시 `notFound()`, API 불필요 호출 차단 |
| caregiver_id TODO 주석 | API 제약 명시적 문서화 → 백엔드 `caregiver_name` 추가 시 교체 포인트 명확 |

---

## 성공 기준 최종 상태

| # | 기준 | 상태 | 증거 |
|---|------|------|------|
| SC-01 | `/guardian` 어르신 목록 렌더링 | ✅ Met | `app/guardian/page.tsx:9` |
| SC-02 | 카드 클릭 → `/guardian/[seniorId]` | ✅ Met | `SeniorCard.tsx:9` Link |
| SC-03 | 어르신 기본 정보 표시 | ✅ Met | `SeniorInfoPanel.tsx` |
| SC-04 | VitalsPanel 최근 5건 | ✅ Met | `vitals.ts:9` `?limit=${limit}` |
| SC-05 | ScheduleList status=scheduled | ✅ Met | `ScheduleList.tsx:15` filter |
| SC-06 | VisitRecordList visit_notes | ✅ Met | `VisitRecordList.tsx:20` |
| SC-07 | Authorization 헤더 | ✅ Met | 전체 fetch `getServerApiHeaders()` |
| SC-08 | 미인증 차단 | ✅ Met | `proxy.ts` (기존) |

**8/8 (100%)**

---

## 생성된 산출물

```
src/entities/senior/
  model/types.ts               SeniorResponse 타입 alias (schema.d.ts 참조)
  api/index.ts                 fetchSeniors(), fetchSenior(id)
  index.ts                     public API

src/features/guardian-dashboard/
  api/schedules.ts             fetchSchedules(seniorId)
  api/records.ts               fetchRecords(seniorId)
  api/vitals.ts                fetchVitals(seniorId, limit=5)
  ui/SeniorCard.tsx            목록 카드 + Link
  ui/SeniorInfoPanel.tsx       기본 정보 패널
  ui/VitalsPanel.tsx           활력징후 테이블
  ui/ScheduleList.tsx          예정 일정 (status=scheduled 필터)
  ui/VisitRecordList.tsx       방문 기록 (visit_notes)
  index.ts                     public API

app/guardian/
  page.tsx                     어르신 목록 (수정)
  loading.tsx / error.tsx
  [seniorId]/
    page.tsx                   상세 대시보드 (Promise.allSettled)
    loading.tsx / error.tsx
```

---

## 다음 단계

- **Milestone 4 계속**: caregiver-dashboard, admin-dashboard 구현
- `entities/senior`는 caregiver/admin 대시보드에서 동일하게 재사용 가능
- 로그아웃: `app/api/auth/logout/route.ts` cookie 삭제 Route Handler (별도 feature)
- 백엔드 요청 사항: `ScheduleResponse`에 `caregiver_name` 필드 추가 (`ScheduleList.tsx` TODO)
