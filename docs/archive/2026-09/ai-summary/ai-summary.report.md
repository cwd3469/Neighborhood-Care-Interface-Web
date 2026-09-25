# [Report] ai-summary

> 방문 기록 AI 요약 — VisitRecordCard + 캐시-first + Route Handler 프록시 완료 보고서

**완료일**: 2026-09-24
**Match Rate**: 100%
**Iteration**: 0회

---

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | ai-summary |
| **완료일** | 2026-09-24 |
| **Match Rate** | 100% |
| **생성 파일** | 4개 신규 + 2개 수정 |

### Value Delivered (4 Perspectives)

| 관점 | 결과 |
|------|------|
| **Problem** | 방문 기록(visit_notes)이 텍스트 덩어리라 보호자가 이상징후를 빠르게 파악할 수 없었음 → VisitRecordCard 인라인 AI 요약으로 완전 해결 |
| **Solution** | 캐시-first(GET→404→POST) + Route Handler 프록시(토큰 미노출) + SummaryState 4-state UI — 기존 guardian-dashboard 패턴 위에 AI 연동 추가 |
| **Function UX Effect** | `idle`→`loading`(스피너)→`done`(요약+빨간배지)→`error`(재시도) 한 클릭 플로우, visit_notes 없는 기록은 버튼 자체 숨김으로 오작동 방지 |
| **Core Value** | Anthropic API 직접 연동 패턴 + Server/Client 혼합 아키텍처 + 캐시-first 전략 — AI Native 포트폴리오 핵심 기능 완성 (Milestone 5) |

---

## 1. 구현 결과

### 1.1 파일 목록 (6개)

**M1 — Route Handlers (2개 신규)**

| 파일 | HTTP | FastAPI 엔드포인트 |
|------|------|------------------|
| `app/api/ai/summarize/[recordId]/route.ts` | POST | `/ai/summarize/{record_id}` |
| `app/api/ai/summary/[recordId]/route.ts` | GET | `/ai/summary/{record_id}` |

**M2 — Client Helper (1개 신규)**

| 파일 | 역할 |
|------|------|
| `src/features/guardian-dashboard/api/ai.ts` | `getSummary` (캐시 조회), `triggerSummary` (LLM 트리거) |

**M3 — UI Component (1개 신규)**

| 컴포넌트 | 핵심 패턴 |
|----------|----------|
| `VisitRecordCard.tsx` | `'use client'`, SummaryState 4-state, 캐시-first 핸들러 |

**M4 — 수정 (2개)**

| 파일 | 변경 내용 |
|------|-----------|
| `VisitRecordList.tsx` | `<li>` 직접 렌더 → `VisitRecordCard` 위임 (Server Component 유지) |
| `index.ts` | `VisitRecordCard` export 추가 |

### 1.2 Success Criteria 최종 현황

| SC | 기준 | 결과 |
|----|------|------|
| SC-01 | AI 요약 보기 버튼 표시 | ✅ Met |
| SC-02 | 캐시 GET → 있으면 즉시 표시 | ✅ Met |
| SC-03 | 캐시 없으면 POST → 응답 표시 | ✅ Met |
| SC-04 | 로딩 스피너 + 버튼 비활성 | ✅ Met |
| SC-05 | 요약 텍스트 인라인 표시 | ✅ Met |
| SC-06 | anomaly_flags 빨간 배지 목록 | ✅ Met |
| SC-07 | 에러 메시지 + 재시도 버튼 | ✅ Met |
| SC-08 | Authorization 헤더 전송 | ✅ Met |

**Success Rate: 8/8 (100%)**

---

## 2. Key Decisions & Outcomes

| 결정 | 근거 | 결과 |
|------|------|------|
| Option C Pragmatic | caregiver ScheduleCard 패턴 재사용 | VisitRecordList Server Component 유지, 6파일 최소화 |
| POST body 없음 | `requestBody?: never` 스키마 확인 | fetch body 미전송, 422 Validation Error 방지 |
| 404 pass-through | Client에서 캐시 없음 감지 | `res.status === 404` → `return null` 패턴 |
| `state === 'idle'` 조건 | 버튼 hidden > disabled | 로딩 중 클릭 불가 + 스피너만 표시, 단순 UX |
| visit_notes 조건 | R-03 리스크 대응 | 기록 없는 카드에서 AI 버튼 미표시 |
| try/catch in handler | 네트워크 오류 처리 | `error` 상태 → 에러 메시지 + 재시도 버튼 |

---

## 3. Milestone 5 AI 기능 완성

| 항목 | 내용 |
|------|------|
| **AI 연동 방식** | Route Handler 프록시 → FastAPI `/ai/summarize`, `/ai/summary` |
| **토큰 보안** | `getServerApiHeaders()` 서버 사이드 — 클라이언트에 JWT 미노출 |
| **캐시 전략** | GET 우선 조회 → 404 시 POST 트리거 → 두 번째 클릭부터 즉시 표시 |
| **이상징후 UX** | `anomaly_flags` 빨간 배지 + 목록 — 보호자 즉시 인지 가능 |

---

## 4. 면접 어필 포인트

1. **AI API 프록시 패턴**: Route Handler가 LLM API 토큰을 서버 사이드에서만 처리 — 클라이언트 보안
2. **캐시-first UX**: 두 번째 클릭은 네트워크 없이 즉시 표시 (LLM 비용 절감 + UX 개선)
3. **Server/Client 혼합**: VisitRecordList(Server) → VisitRecordCard(Client) — 각 레이어의 책임 분리
4. **SummaryState 4-state**: idle/loading/done/error — 비동기 UX 상태 관리 패턴 명시적 표현
5. **openapi-typescript 타입 직접 참조**: `AiSummaryResponse = components['schemas']['AiSummaryResponse']` — 백엔드 스키마 변경 자동 반영
