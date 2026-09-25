# [Analysis] admin-dashboard

> Design vs 구현 Gap 분석

**분석일**: 2026-09-24
**Match Rate**: 100%
**Iteration**: 0

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | Milestone 4 마지막 — 관리자 Full CRUD 없으면 3종 대시보드 패턴 미완성 |
| **WHO** | 프론트 5년차 — guardian/caregiver 패턴 확립 완료 |
| **RISK** | ScheduleTable 복잡도, 어르신 삭제 시 연관 일정 에러 |
| **SUCCESS** | `/admin` → 사용자 비활성화·어르신 CRUD·일정 CRUD 전부 작동 |
| **SCOPE** | 단일 페이지 `/admin` — 사용자 생성 제외 |

---

## 1. 파일 구조 검증

| 분류 | 설계 | 구현 | 상태 |
|------|------|------|------|
| Route Handlers | 5개 신규 | 5개 생성 | ✅ |
| Server Helpers | 2개 | 2개 생성 | ✅ |
| Client Helpers | 3개 | 3개 생성 | ✅ |
| Feature index | 1개 | 1개 (UI export 포함) | ✅ |
| UI Components | 3개 | 3개 생성 | ✅ |
| App 라우트 | 3개 + 1수정 | 3개 신규 + 1수정 | ✅ |
| **합계** | **18** | **18** | ✅ |

---

## 2. Success Criteria 평가

| SC | 기준 | 상태 | 증거 |
|----|------|------|------|
| SC-01 | `/admin` 목록 렌더링 | ✅ Met | `page.tsx:13` — Promise.all 3-fetch |
| SC-02 | 사용자 테이블 role/is_active 표시 | ✅ Met | `UserTable.tsx:34-45` ROLE_LABEL + badge |
| SC-03 | 비활성화 → PATCH → 갱신 | ✅ Met | `UserTable.tsx` + `deactivateUser.ts` + route |
| SC-04 | 어르신 등록 인라인 폼 → POST | ✅ Met | `SeniorTable.tsx:handleCreate` + `seniors.ts` |
| SC-05 | 어르신 수정 인라인 폼 → PUT | ✅ Met | `SeniorTable.tsx:handleUpdate` + `updateSenior` |
| SC-06 | 어르신 삭제 → DELETE | ✅ Met | `SeniorTable.tsx:handleDelete` + window.confirm |
| SC-07 | 일정 생성 (드롭다운) → POST | ✅ Met | `ScheduleTable.tsx:handleCreate` + selects |
| SC-08 | 일정 수정 → PUT | ✅ Met | `ScheduleTable.tsx:handleUpdate` |
| SC-09 | 일정 삭제 → DELETE | ✅ Met | `ScheduleTable.tsx:handleDelete` |
| SC-10 | Authorization 헤더 | ✅ Met | 5개 Route Handler 전부 `getServerApiHeaders()` |
| SC-11 | 미인증 차단 | ✅ Met | 기존 proxy.ts middleware |

**Success Rate: 11/11 (100%)**

---

## 3. Design 결정 검증

| 결정 | 설계 의도 | 구현 확인 | 상태 |
|------|----------|----------|------|
| PATCH deactivate: body 없음 | `_request` unused | `req.json()` 호출 없음 | ✅ |
| PUT+DELETE 단일 파일 | Next.js App Router 표준 | 각 `[id]/route.ts`에 두 export | ✅ |
| schedules route 충돌 없음 | `/[id]` ≠ `/[id]/status` | 경로 분리 확인 | ✅ |
| pendingIds Set 패턴 | 다중 비활성화 동시 처리 | `Set<number>` 사용 | ✅ |
| editingId + isLocked | 수정 중 다른 행 조작 차단 | `editingId !== null \|\| pendingId !== null` | ✅ |
| senior_id 수정 불가 | ScheduleUpdate 스키마 제약 | edit 행에 select 없음, 표시만 | ✅ |
| caregivers 사전 필터 | `role=caregiver && is_active` | `users.filter(...)` in page.tsx | ✅ |
| FSD import 규칙 | app→features→shared | tsc --noEmit 에러 없음 | ✅ |

---

## 4. TypeScript 검증

```
$ pnpm tsc --noEmit
(에러 없음)
```

---

## 5. 리스크 대응 확인

| 리스크 | 대응 방법 | 구현 확인 |
|--------|----------|----------|
| ScheduleTable 복잡도 | editingId로 수정 행 단독 제어 | `isLocked` 패턴 적용 ✅ |
| 어르신 삭제 연관 일정 에러 | BE detail 메시지 → setError | `setError(result.error)` 패턴 ✅ |
| 삭제/변경 후 UI 지연 | pendingId로 버튼 disabled | `disabled={isLocked}` ✅ |

---

## 6. Match Rate 산출

| 카테고리 | 항목 수 | 일치 | Match Rate |
|----------|---------|------|-----------|
| 파일 구조 | 18 | 18 | 100% |
| Success Criteria | 11 | 11 | 100% |
| Design 결정 | 8 | 8 | 100% |
| TypeScript | 1 | 1 | 100% |
| **전체** | **38** | **38** | **100%** |

---

## 7. 결론

Gap 없음. 모든 설계 결정이 구현에 반영됨.
→ Report 단계 진행 권장 (`/pdca report admin-dashboard`)
