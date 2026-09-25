# [Design] ai-summary

> 방문 기록 AI 요약 — VisitRecordCard + 캐시-first + Route Handler 프록시

**작성일**: 2026-09-24
**상태**: Design 완료
**선택 옵션**: C — Pragmatic

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | Milestone 5 — AI 요약 없으면 포트폴리오 AI 기능 미완성, Anthropic API 직접 연동 학습 목적 |
| **WHO** | 프론트 5년차 — guardian-dashboard 패턴 확립 완료, Anthropic API 신규 학습 |
| **RISK** | LLM 응답 지연 (수 초) → 로딩 UX 필수; POST body 없음 (requestBody?: never 확인) |
| **SUCCESS** | VisitRecordList 각 기록에 AI 버튼 → 캐시 우선 → 요약 + 이상징후 표시 |
| **SCOPE** | guardian-dashboard `/guardian/[seniorId]` VisitRecordList 인라인 — caregiver 확장 별도 |

---

## 1. Overview

### 1.1 선택 옵션 비교

| 옵션 | 설명 | 파일 수 | 선택 |
|------|------|---------|------|
| A — Minimal | VisitRecordList 'use client' 전환, 내부 Map 상태 | 4 | |
| B — Clean Arch | ai-summary 전용 FSD slice 신규 | 8+ | |
| **C — Pragmatic** | **VisitRecordList Server 유지 + VisitRecordCard 추출** | **6** | **✅** |

**선택 근거**: caregiver-dashboard의 ScheduleCard 패턴과 동일 — 검증된 패턴 재사용, Server Component 이점 유지, 파일 수 최적.

### 1.2 아키텍처 원칙

- **VisitRecordList**: Server Component 유지 — fetch 데이터를 props로 전달
- **VisitRecordCard**: 새 'use client' 컴포넌트 — AI 버튼/상태 담당
- **Route Handler**: Client → `/api/ai/...` → `getServerApiHeaders()` → FastAPI (토큰 미노출)
- **캐시-first**: GET → 404 → POST 순서, 이미 생성된 요약은 즉시 표시

---

## 2. 파일 구조 (6개)

```
app/
  api/
    ai/
      summarize/
        [recordId]/
          route.ts           ← M1: POST 프록시 (신규)
      summary/
        [recordId]/
          route.ts           ← M1: GET 프록시 (신규)

src/
  features/
    guardian-dashboard/
      api/
        ai.ts                ← M2: getSummary, triggerSummary (신규)
      ui/
        VisitRecordCard.tsx  ← M3: 'use client' + AI 버튼 + 상태 (신규)
        VisitRecordList.tsx  ← M4: VisitRecordCard 사용하도록 수정 (수정)
      index.ts               ← M4: VisitRecordCard export 추가 (수정)
```

**신규 4개 / 수정 2개 = 총 6개**

---

## 3. Module Map

| 모듈 | 파일 | 역할 |
|------|------|------|
| M1 | `app/api/ai/summarize/[recordId]/route.ts` | POST 프록시 |
| M1 | `app/api/ai/summary/[recordId]/route.ts` | GET 프록시 |
| M2 | `src/features/guardian-dashboard/api/ai.ts` | Client helpers |
| M3 | `src/features/guardian-dashboard/ui/VisitRecordCard.tsx` | AI 버튼 UI |
| M4 | `src/features/guardian-dashboard/ui/VisitRecordList.tsx` | VisitRecordCard 위임 |
| M4 | `src/features/guardian-dashboard/index.ts` | export 추가 |

---

## 4. API 설계

### 4.1 Route Handlers

#### `app/api/ai/summarize/[recordId]/route.ts` — POST

```typescript
import { NextResponse } from 'next/server'
import { SERVER_API_URL, getServerApiHeaders } from '@shared/api/server'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ recordId: string }> }
) {
  const { recordId } = await params
  // Design Ref: §4.1 — POST body 없음 (requestBody?: never)
  const res = await fetch(`${SERVER_API_URL}/ai/summarize/${recordId}`, {
    method: 'POST',
    headers: await getServerApiHeaders(),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'AI 요약 생성 실패' }))
    return NextResponse.json(error, { status: res.status })
  }
  return NextResponse.json(await res.json())
}
```

#### `app/api/ai/summary/[recordId]/route.ts` — GET

```typescript
import { NextResponse } from 'next/server'
import { SERVER_API_URL, getServerApiHeaders } from '@shared/api/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ recordId: string }> }
) {
  const { recordId } = await params
  const res = await fetch(`${SERVER_API_URL}/ai/summary/${recordId}`, {
    headers: await getServerApiHeaders(),
    cache: 'no-store',
  })
  // Design Ref: §4.1 — 404 그대로 전달 (캐시 없음 신호)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: '캐시 없음' }))
    return NextResponse.json(error, { status: res.status })
  }
  return NextResponse.json(await res.json())
}
```

### 4.2 Client Helpers (`ai.ts`)

```typescript
import type { components } from '@shared/api/schema'

type AiSummaryResponse = components['schemas']['AiSummaryResponse']

// 캐시 조회 — 없으면 null 반환 (404)
export async function getSummary(recordId: number): Promise<AiSummaryResponse | null> {
  const res = await fetch(`/api/ai/summary/${recordId}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error('getSummary failed')
  return res.json()
}

// 생성 트리거 — 생성된 요약 반환
export async function triggerSummary(
  recordId: number
): Promise<{ ok: boolean; data?: AiSummaryResponse; error?: string }> {
  const res = await fetch(`/api/ai/summarize/${recordId}`, { method: 'POST' })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return { ok: false, error: body.detail ?? 'AI 요약 생성 실패' }
  }
  return { ok: true, data: await res.json() }
}
```

---

## 5. VisitRecordCard 설계

### 5.1 Props & State

```typescript
'use client'
import type { VisitRecordResponse } from '../api/records'
import type { components } from '@shared/api/schema'

type AiSummaryResponse = components['schemas']['AiSummaryResponse']
type SummaryState = 'idle' | 'loading' | 'done' | 'error'

interface Props {
  record: VisitRecordResponse
}
```

**내부 상태:**
```typescript
const [state, setState]     = useState<SummaryState>('idle')
const [summary, setSummary] = useState<AiSummaryResponse | null>(null)
const [error, setError]     = useState<string | null>(null)
```

### 5.2 캐시-first 핸들러

```typescript
// Plan SC: SC-02, SC-03, SC-04
async function handleSummarize() {
  setState('loading')
  setError(null)
  try {
    // Step 1: 캐시 확인
    const cached = await getSummary(record.id)
    if (cached) {
      setSummary(cached)
      setState('done')
      return
    }
    // Step 2: LLM 트리거
    const result = await triggerSummary(record.id)
    if (result.ok && result.data) {
      setSummary(result.data)
      setState('done')
    } else {
      setError(result.error ?? '요약 생성 실패')
      setState('error')
    }
  } catch {
    setError('네트워크 오류가 발생했습니다')
    setState('error')
  }
}
```

### 5.3 렌더링 규칙

| 상태 | 렌더링 |
|------|--------|
| `idle` | "AI 요약 보기" 버튼 (visit_notes 없으면 숨김) |
| `loading` | 버튼 disabled + 스피너 + "요약 생성 중..." |
| `done` | summary 텍스트 + anomaly_flags 빨간 배지 (있을 때만) |
| `error` | 에러 메시지 + "재시도" 버튼 |

### 5.4 AiSummaryBlock 인라인 설계

```
┌─────────────────────────────────────────┐
│ 2026-01-15 14:30                        │
│ 어르신 상태가 양호함...                  │
│                                         │
│ ┌─── AI 요약 ────────────────────────┐  │
│ │ 요약 텍스트 인라인 표시...           │  │
│ │                                    │  │
│ │ ⚠ 이상징후                         │  │
│ │ [혈압 이상] [체온 상승]             │  │  ← 빨간 배지
│ └────────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## 6. VisitRecordList 수정 설계

**변경 전** (현재):
```typescript
// Server Component, <li>로 직접 렌더링
{records.map((r) => (
  <li key={r.id} ...>
    {/* 날짜, visit_notes */}
  </li>
))}
```

**변경 후**:
```typescript
// Design Ref: §6 — VisitRecordCard 위임
{records.map((r) => (
  <VisitRecordCard key={r.id} record={r} />
))}
```

- Server Component 유지 (fetch 로직 변경 없음)
- `VisitRecordCard` import 추가만 필요

---

## 7. 타입 참조

| 타입 | 출처 |
|------|------|
| `AiSummaryResponse` | `components['schemas']['AiSummaryResponse']` |
| `VisitRecordResponse` | `src/features/guardian-dashboard/api/records.ts` |

**AiSummaryResponse 필드 확인** (schema.d.ts):
```typescript
{
  id: number
  record_id: number
  summary: string
  anomaly_flags?: string[] | null   // ← 배지 목록
  generated_at: string              // ISO datetime
  model_used: string
}
```

---

## 8. 의존성

| 의존성 | 위치 | 비고 |
|--------|------|------|
| `SERVER_API_URL`, `getServerApiHeaders` | `@shared/api/server` | Route Handler에서 사용 |
| `VisitRecordResponse` | `../api/records` | VisitRecordCard Props |
| `components['schemas']` | `@shared/api/schema` | AiSummaryResponse 타입 |

---

## 9. Success Criteria (Plan → Design 매핑)

| SC | 기준 | 설계 위치 |
|----|------|-----------|
| SC-01 | AI 요약 보기 버튼 표시 | VisitRecordCard `idle` 상태 |
| SC-02 | 버튼 클릭 → 캐시 GET | `handleSummarize` Step 1 |
| SC-03 | 캐시 없으면 POST 트리거 | `handleSummarize` Step 2 |
| SC-04 | 로딩 스피너 + disabled | `loading` 상태 렌더링 |
| SC-05 | 요약 텍스트 인라인 표시 | `done` 상태 + AiSummaryBlock |
| SC-06 | anomaly_flags 빨간 배지 | `done` 상태 조건부 렌더링 |
| SC-07 | 에러 메시지 표시 | `error` 상태 + 재시도 버튼 |
| SC-08 | Authorization 헤더 | Route Handler `getServerApiHeaders()` |

---

## 10. 리스크 대응

| 리스크 | 대응 |
|--------|------|
| LLM 응답 지연 | `loading` 상태: 버튼 disabled + 스피너 |
| visit_notes 없는 기록 | `idle` 상태: `record.visit_notes` 없으면 버튼 숨김 |
| 네트워크 오류 | try/catch → `error` 상태 + "네트워크 오류" 메시지 |
| POST body 전송 오류 | `requestBody?: never` 확인 — body 없이 POST 전송 |

---

## 11. Implementation Guide

### 11.1 구현 순서

```
M1 → M2 → M3 → M4
```

1. **M1**: Route Handlers 2개 (신규) — POST/GET 프록시
2. **M2**: `ai.ts` Client helpers (신규) — `getSummary`, `triggerSummary`
3. **M3**: `VisitRecordCard.tsx` (신규) — 'use client', 상태 + 렌더링
4. **M4**: `VisitRecordList.tsx` 수정 + `index.ts` export 추가

### 11.2 Key Implementation Notes

- Route Handler params: `{ params }: { params: Promise<{ recordId: string }> }` — async await 필수 (Next.js 16)
- POST body 없음: `fetch(url, { method: 'POST', headers })` — body 미전송
- 404 처리: GET Route Handler에서 `res.status === 404` → `NextResponse.json(..., { status: 404 })` 그대로 전달
- Client에서 404 감지: `res.status === 404` → `return null`

### 11.3 Session Guide

**단일 세션 구현 가능** (총 6파일, 범위 작음)

| 세션 | 모듈 | 파일 |
|------|------|------|
| Session 1 | M1+M2+M3+M4 | 전체 6개 |

---

## 12. 다음 단계

- `/pdca do ai-summary`
