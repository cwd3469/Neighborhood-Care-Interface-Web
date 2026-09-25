# [Analysis] ai-summary

> Design vs 구현 Gap 분석

**분석일**: 2026-09-24
**Match Rate**: 100%
**Iteration**: 0

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | Milestone 5 — Anthropic API 직접 연동, AI Native 포트폴리오 핵심 |
| **WHO** | 프론트 5년차 — guardian-dashboard 패턴 확립 완료 |
| **RISK** | LLM 응답 지연(수 초); POST body 없음 (requestBody?: never) |
| **SUCCESS** | VisitRecordList 각 기록: AI 버튼 → 캐시 우선 → 요약 + 이상징후 |
| **SCOPE** | `/guardian/[seniorId]` VisitRecordList 인라인 |

---

## 1. 파일 구조 검증

| 분류 | 설계 | 구현 | 상태 |
|------|------|------|------|
| Route Handler — POST | `app/api/ai/summarize/[recordId]/route.ts` | 생성 | ✅ |
| Route Handler — GET | `app/api/ai/summary/[recordId]/route.ts` | 생성 | ✅ |
| Client helpers | `api/ai.ts` | 생성 | ✅ |
| VisitRecordCard | `ui/VisitRecordCard.tsx` | 생성 | ✅ |
| VisitRecordList | `ui/VisitRecordList.tsx` | 수정 | ✅ |
| index.ts | export 추가 | 수정 | ✅ |
| **합계** | **6** | **6** | ✅ |

---

## 2. Success Criteria 평가

| SC | 기준 | 상태 | 증거 |
|----|------|------|------|
| SC-01 | AI 요약 보기 버튼 표시 | ✅ Met | `VisitRecordCard.tsx:63-70` — `state === 'idle'` 조건 |
| SC-02 | 버튼 클릭 → 캐시 GET → 있으면 표시 | ✅ Met | `VisitRecordCard.tsx:25-30` + `ai.ts:7-12` |
| SC-03 | 캐시 없으면 POST 트리거 → 응답 표시 | ✅ Met | `VisitRecordCard.tsx:31-38` + `ai.ts:15-24` |
| SC-04 | 로딩 스피너 + 버튼 비활성화 | ✅ Met | `VisitRecordCard.tsx:72-81` 스피너, 버튼은 `idle`일 때만 렌더 |
| SC-05 | 요약 텍스트 인라인 표시 | ✅ Met | `VisitRecordCard.tsx:84-103` `done` 상태 블록 |
| SC-06 | anomaly_flags 빨간 배지 + 목록 | ✅ Met | `VisitRecordCard.tsx:88-100` 조건부 렌더링 |
| SC-07 | 에러 메시지 + 재시도 버튼 | ✅ Met | `VisitRecordCard.tsx:106-117` `error` 상태 |
| SC-08 | Authorization 헤더 전송 | ✅ Met | 두 Route Handler 모두 `getServerApiHeaders()` |

**Success Rate: 8/8 (100%)**

---

## 3. Design 결정 검증

| 결정 | 설계 의도 | 구현 확인 | 상태 |
|------|----------|----------|------|
| VisitRecordList Server Component 유지 | `'use client'` 없음 | `VisitRecordList.tsx` directive 없음 | ✅ |
| VisitRecordCard 'use client' | Client 상태 관리 | `VisitRecordCard.tsx:1` `'use client'` | ✅ |
| POST body 없음 | `requestBody?: never` | `route.ts:11-13` body 미전송 | ✅ |
| 404 pass-through | Client 캐시 없음 감지 | `summary/route.ts:15-17` status 그대로 | ✅ |
| cache: 'no-store' | GET 캐시 방지 | `summary/route.ts:12` | ✅ |
| Next.js 16 async params | `params: Promise<{...}>` | 두 route.ts 모두 `await params` | ✅ |
| try/catch in handleSummarize | 네트워크 오류 처리 | `VisitRecordCard.tsx:39-42` | ✅ |
| anomaly_flags 조건부 | `null` 또는 빈 배열 처리 | `summary.anomaly_flags?.length > 0` | ✅ |
| FSD import 규칙 | app→features→shared | `@shared/api/schema` 사용 | ✅ |

---

## 4. TypeScript 검증

```
$ pnpm tsc --noEmit
(에러 없음)
```

---

## 5. 리스크 대응 확인

| 리스크 | 대응 방법 | 구현 확인 |
|--------|----------|------------|
| LLM 응답 지연 | `loading` 상태: 버튼 숨김 + 스피너 | `state === 'idle'` 조건 ✅ |
| visit_notes 없는 기록 | `record.visit_notes` 조건으로 버튼 숨김 | `VisitRecordCard.tsx:63` ✅ |
| 네트워크 오류 | try/catch → `error` 상태 | `VisitRecordCard.tsx:39-42` ✅ |
| POST body 전송 오류 | body 없이 POST | `app/api/ai/summarize/.../route.ts:11` ✅ |

---

## 6. Match Rate 산출

| 카테고리 | 항목 수 | 일치 | Match Rate |
|----------|---------|------|-----------:|
| 파일 구조 | 6 | 6 | 100% |
| Success Criteria | 8 | 8 | 100% |
| Design 결정 | 9 | 9 | 100% |
| TypeScript | 1 | 1 | 100% |
| **전체** | **24** | **24** | **100%** |

---

## 7. 결론

Gap 없음. 모든 설계 결정이 구현에 반영됨.
→ Report 단계 진행 권장 (`/pdca report ai-summary`)
