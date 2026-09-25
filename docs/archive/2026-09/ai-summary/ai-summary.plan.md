# [Plan] ai-summary

> 방문 기록 AI 요약 — 보호자 대시보드 VisitRecordList 인라인 표시

**작성일**: 2026-09-24
**상태**: Plan 완료

---

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | ai-summary |
| **Milestone** | 5 — AI 요약 기능 통합 |
| **관련 엔드포인트** | POST /ai/summarize/{record_id}, GET /ai/summary/{record_id} |

### Value Delivered (4 Perspectives)

| 관점 | 내용 |
|------|------|
| **Problem** | 방문 기록(visit_notes)이 텍스트 덩어리라 보호자가 빠르게 파악하기 어렵고 이상징후를 놓칠 수 있음 |
| **Solution** | 각 방문 기록 카드에 "AI 요약" 버튼 → 캐시 우선 조회 → 없으면 LLM 트리거 → 요약 + 이상징후 배지 인라인 표시 |
| **Function UX Effect** | 보호자가 `/guardian/[seniorId]` 방문 기록 목록에서 한 클릭으로 LLM 요약 확인, 빨간 배지로 이상징후 즉시 인지 |
| **Core Value** | Anthropic Claude API 연동 패턴 + Server/Client 혼합 + 캐시-first 전략 — AI Native 포트폴리오 핵심 기능 |

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | Milestone 5 — AI 요약 없으면 포트폴리오 AI 기능 미완성, Anthropic API 직접 연동 학습 목적도 있음 |
| **WHO** | 프론트 5년차 — guardian-dashboard 패턴 확립 완료, Anthropic API 신규 학습 |
| **RISK** | LLM 응답 지연 (수 초) → 로딩 UX 필수; POST body 없음 (path param만) — 확인 완료 |
| **SUCCESS** | VisitRecordList 각 기록에 AI 버튼 → 캐시 우선 → 요약 + 이상징후 표시 |
| **SCOPE** | guardian-dashboard `/guardian/[seniorId]` VisitRecordList 인라인 — caregiver 확장은 별도 feature |

---

## 1. 요구사항

### 1.1 기능 요구사항

| # | 요구사항 | 우선순위 |
|---|----------|----------|
| R-01 | VisitRecordList 각 기록에 "AI 요약" 버튼 표시 | Must |
| R-02 | 버튼 클릭 → GET /api/ai/summary/{id} 캐시 먼저 확인 | Must |
| R-03 | 캐시 없으면(404) → POST /api/ai/summarize/{id} 트리거 | Must |
| R-04 | 생성 중 로딩 스피너 표시 | Must |
| R-05 | 요약 성공 → summary 텍스트 카드 내 인라인 표시 | Must |
| R-06 | anomaly_flags 있으면 빨간 배지 + 목록 표시 | Must |
| R-07 | 에러 시 (LLM 실패 등) 에러 메시지 표시 | Must |
| R-08 | 이미 요약된 기록: 버튼 대신 요약 즉시 표시 (선택 가능) | Should |

### 1.2 비기능 요구사항

| # | 요구사항 |
|---|----------|
| NF-01 | Route Handler 프록시 — `getServerApiHeaders()` 사용, 클라이언트에 토큰 미노출 |
| NF-02 | VisitRecordCard는 'use client' — 버튼 클릭/상태 관리 필요 |
| NF-03 | VisitRecordList는 Server Component 유지 — VisitRecordCard를 자식으로 사용 |

### 1.3 Known Constraints

| 제약 | 내용 |
|------|------|
| POST body 없음 | `POST /ai/summarize/{id}` — requestBody 없음, path param만 (schema 확인) |
| LLM 응답 지연 | 수 초 소요 → 로딩 중 버튼 disabled + 스피너 필수 |
| 초기 로드 시 캐시 조회 없음 | 페이지 첫 렌더는 캐시 조회 안 함 (Server Component fetch 범위 확장 불필요) — 버튼 클릭 시에만 캐시 확인 |

---

## 2. API 매핑

| 기능 | 프론트 엔드포인트 | 방향 |
|------|-----------------|------|
| 캐시 요약 조회 | `GET /api/ai/summary/[recordId]` | Client → Route Handler → FastAPI |
| 요약 생성 트리거 | `POST /api/ai/summarize/[recordId]` | Client → Route Handler → FastAPI |

**캐시-first 흐름:**
```
버튼 클릭
  └─ GET /api/ai/summary/{id}
       ├─ 200: 요약 표시 (끝)
       └─ 404: POST /api/ai/summarize/{id}
                 ├─ 200: 요약 표시 (끝)
                 └─ 에러: 에러 메시지 표시
```

---

## 3. 화면 구조 (변경 후)

```
/guardian/[seniorId]
  └─ VisitRecordList (Server Component — 변경 없음)
       └─ VisitRecordCard × N  ← NEW 'use client'
            ├─ 날짜 / visit_notes (기존)
            ├─ [AI 요약 보기] 버튼 (신규)
            └─ AiSummaryBlock (신규, 버튼 클릭 후 표시)
                 ├─ summary 텍스트
                 └─ anomaly_flags 빨간 배지 목록 (있을 때만)
```

---

## 4. 파일 계획

```
app/
  api/
    ai/
      summarize/
        [recordId]/
          route.ts           ← POST 프록시 (신규)
      summary/
        [recordId]/
          route.ts           ← GET 프록시 (신규)

src/
  features/
    guardian-dashboard/
      api/
        ai.ts                ← getSummary, triggerSummary Client helpers (신규)
      ui/
        VisitRecordCard.tsx  ← 'use client' + AI 버튼 + 상태 (신규)
        VisitRecordList.tsx  ← VisitRecordCard 사용하도록 수정 (수정)
      index.ts               ← VisitRecordCard export 추가 (수정)
```

**신규 파일**: 4개 / **수정 파일**: 2개 (총 6개)

---

## 5. Route Handler 설계

### 5.1 `app/api/ai/summarize/[recordId]/route.ts`

```typescript
export async function POST(_request: Request, { params }) {
  const { recordId } = await params
  // POST body 없음 (schema 확인: requestBody?: never)
  const res = await fetch(`${SERVER_API_URL}/ai/summarize/${recordId}`, {
    method: 'POST',
    headers: await getServerApiHeaders(),
  })
  // ...
}
```

### 5.2 `app/api/ai/summary/[recordId]/route.ts`

```typescript
export async function GET(_request: Request, { params }) {
  const { recordId } = await params
  const res = await fetch(`${SERVER_API_URL}/ai/summary/${recordId}`, {
    headers: await getServerApiHeaders(),
  })
  // 404 그대로 전달 — Client에서 캐시 없음 감지
  // ...
}
```

---

## 6. Client Helpers (`ai.ts`) 설계

```typescript
type AiSummaryResponse = components['schemas']['AiSummaryResponse']

// 캐시 조회 — 없으면 null 반환 (404)
export async function getSummary(recordId: number): Promise<AiSummaryResponse | null>

// 생성 트리거 — 생성된 요약 반환
export async function triggerSummary(recordId: number): Promise<{ ok: boolean; data?: AiSummaryResponse; error?: string }>
```

---

## 7. VisitRecordCard 설계

```typescript
'use client'
interface Props {
  record: VisitRecordResponse
}
```

**내부 상태:**
```typescript
type SummaryState = 'idle' | 'loading' | 'done' | 'error'

const [state, setState]     = useState<SummaryState>('idle')
const [summary, setSummary] = useState<AiSummaryResponse | null>(null)
const [error, setError]     = useState<string | null>(null)
```

**AI 요약 핸들러 (캐시-first):**
```typescript
async function handleSummarize() {
  setState('loading')
  // Step 1: 캐시 확인
  const cached = await getSummary(record.id)
  if (cached) { setSummary(cached); setState('done'); return }
  // Step 2: LLM 트리거
  const result = await triggerSummary(record.id)
  if (result.ok && result.data) { setSummary(result.data); setState('done') }
  else { setError(result.error ?? '요약 생성 실패'); setState('error') }
}
```

**렌더링:**
- `idle`: "AI 요약 보기" 버튼
- `loading`: 버튼 disabled + 스피너 + "요약 생성 중..."
- `done`: summary 텍스트 + anomaly_flags 배지
- `error`: 에러 메시지 + 재시도 버튼

---

## 8. Success Criteria

| # | 기준 | 검증 방법 |
|---|------|----------|
| SC-01 | 각 방문 기록에 "AI 요약 보기" 버튼 표시 | 화면 확인 |
| SC-02 | 버튼 클릭 → 캐시 GET → 있으면 표시 | 두 번째 클릭 시 즉시 표시 |
| SC-03 | 캐시 없으면 POST 트리거 → 응답 표시 | 첫 클릭 후 로딩 → 표시 |
| SC-04 | 생성 중 로딩 스피너 + 버튼 disabled | 클릭 후 UX 확인 |
| SC-05 | 요약 텍스트 인라인 표시 | 화면 확인 |
| SC-06 | anomaly_flags 빨간 배지 + 목록 | 이상징후 있는 기록 확인 |
| SC-07 | 에러 시 메시지 표시 | 백엔드 에러 시뮬레이션 |
| SC-08 | Authorization 헤더 전송 | Network 확인 |

---

## 9. 리스크

| # | 리스크 | 심각도 | 대응 |
|---|--------|--------|------|
| R-01 | LLM 응답 지연 (3~10초) | Medium | 로딩 스피너 + 버튼 disabled + 취소 없음 (단순화) |
| R-02 | 백엔드 LLM 서비스 미작동 | Medium | 에러 메시지 표시 + 재시도 버튼 |
| R-03 | visit_notes 없는 기록에서 요약 시도 | Low | 버튼을 visit_notes 있을 때만 표시 |

---

## 10. 다음 단계

- `/pdca design ai-summary`
