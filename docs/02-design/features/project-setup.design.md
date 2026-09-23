# [Design] project-setup

> FSD 프로젝트 구조 셋팅 — Option C Pragmatic

**작성일**: 2026-09-19
**선택 아키텍처**: Option C — Pragmatic Balance
**상태**: Design 완료

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 기능 추가 속도가 빨라질수록 구조 없이는 유지보수 불가 — 초기 셋팅이 이후 모든 Milestone의 기반 |
| **WHO** | 프론트 개발자 1인 (5년차) — 기초 설명 불필요, 구조적 근거 중심 |
| **RISK** | Next.js `app/` 라우팅과 FSD `src/` 계층이 충돌하지 않도록 경계를 명확히 해야 함 |
| **SUCCESS** | `src/` 아래 FSD 폴더 생성 완료 + `@entities/*` 등 alias import가 실제 동작함 |
| **SCOPE** | FSD 폴더 + tsconfig paths만 — 인증, FastAPI 클라이언트 구현, ESLint 경계 강제는 제외 |

---

## 1. 아키텍처 결정

### 선택: Option C — Pragmatic Balance

**근거**:
- Plan에서 확정한 범위(FSD 폴더 + tsconfig alias)와 정확히 일치
- 세그먼트 폴더(`ui/`, `model/`, `api/`)와 `index.ts` placeholder를 두어 기능 구현 시 어디에 파일을 놓을지 즉시 명확
- ESLint 경계 강제는 별도 feature로 분리 — 지금은 폴더 구조와 컨벤션 문서화로 충분
- `export {}` placeholder가 있는 `index.ts`는 "이 슬라이스의 public API는 여기서만 나온다"는 패턴을 코드 리뷰 시부터 강제

---

## 2. 디렉토리 구조 (확정)

```
web/                          # Next.js 프로젝트 루트
  app/                        # Next.js App Router (FSD pages 역할)
    layout.tsx
    page.tsx
    globals.css
  src/                        # FSD 도메인 계층 루트
    entities/
      patient/
        ui/                   # PatientCard 등 도메인 UI 컴포넌트 (추후)
        model/                # Patient 타입, 상태 (추후)
        api/                  # FHIR Observation 매핑 로직 위치 (추후)
        index.ts              # export {} placeholder
      caregiver/
        ui/
        model/
        api/
        index.ts
    features/
      record-health-metric/
        ui/                   # 건강수치 입력 폼 (추후)
        model/                # 폼 상태, 훅 (추후)
        api/                  # FHIR Observation POST (추후)
        index.ts
      match-visit-schedule/
        ui/                   # 일정 매칭 UI (추후)
        model/
        api/
        index.ts
    widgets/
      visit-record-timeline/
        ui/                   # 방문기록 이력 타임라인 (추후)
        model/                # 타임라인 상태 (추후)
        index.ts              # widgets는 api 세그먼트 없음
    shared/
      api/
        index.ts              # fetch wrapper TODO (FastAPI 스펙 확정 후)
      ui/
        index.ts              # 공통 컴포넌트 자리 (버튼, 인풋 등)
  tsconfig.json               # paths 업데이트
  CLAUDE.md                   # FSD 컨벤션 추가
```

---

## 3. tsconfig.json 변경

### 변경 전
```json
"paths": {
  "@/*": ["./*"]
}
```

### 변경 후
```json
"paths": {
  "@/*": ["./*"],
  "@entities/*": ["./src/entities/*"],
  "@features/*": ["./src/features/*"],
  "@widgets/*":  ["./src/widgets/*"],
  "@shared/*":   ["./src/shared/*"]
}
```

**설계 근거**:
- `@/*`는 루트 기준 유지 → `app/layout.tsx`의 `@/app/globals.css` 등 기존 import 보존
- FSD alias는 `src/` 내부 접근 전용 — 계층 명칭이 import 경로에 명시적으로 드러남
- `import { Patient } from '@entities/patient'` 형태가 자연스러운 FSD 관용구

---

## 4. index.ts Placeholder 패턴

모든 슬라이스의 `index.ts`:

```typescript
// Design Ref: §2 — FSD Public API pattern
// 이 슬라이스의 외부 노출 항목만 re-export.
// 세그먼트 내부 파일(ui/xxx.tsx)을 직접 import하지 말 것.
//
// 예시 (기능 구현 시 교체):
// export { PatientCard } from './ui/PatientCard'
// export type { Patient } from './model/types'
export {};
```

`shared/api/index.ts`:
```typescript
// Design Ref: §2 — shared/api
// FastAPI 클라이언트 뼈대. 실제 구현은 백엔드 API 스펙 확정 후.
// Plan SC: @shared 는 도메인 무관 — fetch wrapper만, 도메인 로직 없음
//
// TODO: createApiClient(baseUrl: string) 구현
// TODO: 인증 헤더 주입 (JWT 토큰 — 별도 feature에서)
export {};
```

`shared/ui/index.ts`:
```typescript
// Design Ref: §2 — shared/ui
// 도메인 무관 공통 UI 컴포넌트 (버튼, 인풋, 카드 등).
// Tailwind v4 기반. shadcn/ui 등 도입 시 여기서 re-export.
//
// TODO: Button, Input, Card 기본 컴포넌트
export {};
```

---

## 5. FSD 계층 의존성 규칙 (컨벤션)

ESLint 강제 없이 컨벤션으로 유지 (별도 feature에서 강제 예정):

```
app/  →  widgets  →  features  →  entities  →  shared
(위에서 아래 방향만 허용)
```

| 금지 패턴 | 이유 |
|----------|------|
| `entities`에서 `features` import | 역방향 — 도메인 객체가 행동에 의존하면 안 됨 |
| `features/record-health-metric`에서 `features/match-visit-schedule` import | 같은 계층 슬라이스 간 금지 — 슬라이스 독립성 위반 |
| `shared`에서 `entities` import | 역방향 — shared는 도메인을 몰라야 함 |
| `app/`에서 `src/entities` 직접 (슬라이스 내부 파일) import | `index.ts` 통해서만 접근 |

---

## 6. CLAUDE.md 추가 내용

구현 완료 후 `CLAUDE.md`에 아래 섹션 추가:

```markdown
## FSD Architecture

src/ 아래 Feature-Sliced Design 구조 사용.
- 계층: app/ (Next.js routing) → widgets → features → entities → shared
- 각 슬라이스는 index.ts를 통해서만 외부에 노출 (세그먼트 직접 import 금지)
- import 방향: 위 계층만 아래 계층을 import 가능 (역방향/동레벨 슬라이스 간 금지)
- Path alias: @entities/*, @features/*, @widgets/*, @shared/*
```

---

## 7. 구현 가이드 (Do Phase)

### 7.1 구현 순서

| 순서 | 작업 | 예상 시간 |
|------|------|----------|
| 1 | `src/` 디렉토리 + 슬라이스 폴더 구조 생성 | 5분 |
| 2 | 각 슬라이스 `index.ts` placeholder 생성 | 5분 |
| 3 | `tsconfig.json` paths 업데이트 | 2분 |
| 4 | `pnpm build` 로 기존 코드 깨지지 않는지 확인 | 2분 |
| 5 | `CLAUDE.md` FSD 섹션 추가 | 3분 |

### 7.2 Session Guide

이 feature는 단일 세션으로 완료 가능. `--scope` 분리 불필요.

### 7.3 검증 기준

- `pnpm build` 통과 (기존 `app/` 코드 깨지지 않음)
- `import {} from '@entities/patient'` 형태의 import가 TypeScript에서 에러 없음
- 각 슬라이스 `index.ts` 존재 확인
