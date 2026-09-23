# [Plan] project-setup

> 시니어 케어 Next.js 프론트엔드 FSD 구조 셋팅

**작성일**: 2026-09-19
**Milestone**: 사전 셋팅 (Milestone 4 프론트 대시보드 연동 전)
**상태**: Plan 완료

---

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | project-setup |
| **작성일** | 2026-09-19 |
| **대상 Milestone** | Milestone 2 완료 전, Milestone 4 시작 전 |

### Value Delivered (4 Perspectives)

| 관점 | 내용 |
|------|------|
| **Problem** | 스캐폴드 상태의 Next.js 프로젝트에 구조 없이 컴포넌트를 추가하면 도메인 간 의존성이 뒤엉켜 3인 역할(보호자/요양사/관리자) 기능 추가 시 스파게티 코드가 된다 |
| **Solution** | Feature-Sliced Design(FSD) 계층 구조를 초기에 확립하고 tsconfig path alias를 세팅해 import 방향이 코드 레벨에서 강제되게 한다 |
| **Function UX Effect** | 개발자가 새 기능을 어디에 둘지 즉시 알 수 있고, PR 리뷰 시 "이 파일 왜 여기?" 질문이 사라진다 |
| **Core Value** | 포트폴리오 어필 포인트 — "FSD 계층 의존성 규칙을 폴더 구조와 path alias로 강제했다"는 설계 근거를 면접에서 명확히 설명 가능 |

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

## 1. 요구사항

### 1.1 포함 범위

| # | 요구사항 | 우선순위 |
|---|---------|---------|
| R-01 | `src/` 하위 FSD 계층 폴더 생성 (entities, features, widgets, shared) | P0 |
| R-02 | 각 슬라이스에 `ui/`, `model/`, `api/` 세그먼트 + `index.ts` placeholder 생성 | P0 |
| R-03 | `tsconfig.json`에 FSD 계층별 path alias 추가 (`@entities/*`, `@features/*`, `@widgets/*`, `@shared/*`) | P0 |
| R-04 | 기존 `@/*` → `./` alias 유지 (app/ 접근 깨지지 않게) | P0 |

### 1.2 제외 범위

- ESLint `eslint-plugin-boundaries` / `steiger` 설정 (별도 feature)
- `shared/api/` FastAPI fetch wrapper 구현 (백엔드 API 스펙 확정 후)
- NextAuth / JWT 인증 (Milestone 2 백엔드 골격 완료 후)
- `.env.local` 환경변수 구성 (별도 feature)

---

## 2. 도메인 슬라이스 구조

### 생성할 디렉토리 트리

```
src/
  entities/
    patient/
      ui/
      model/
      api/
      index.ts        # Public API: 이 슬라이스에서 외부로 노출할 것만
    caregiver/
      ui/
      model/
      api/
      index.ts
  features/
    record-health-metric/
      ui/             # 건강수치 입력 폼 컴포넌트 (추후 구현)
      model/          # 상태, 훅 (추후 구현)
      api/            # FHIR Observation POST 호출 (추후 구현)
      index.ts
    match-visit-schedule/
      ui/             # 일정 매칭 UI (추후 구현)
      model/
      api/
      index.ts
  widgets/
    visit-record-timeline/
      ui/             # 방문기록 이력 타임라인 (추후 구현)
      model/
      index.ts        # widgets는 api 세그먼트 불필요 (entities/features 조합)
  shared/
    api/
      index.ts        # fetch wrapper 뼈대 (TODO: 실제 구현은 나중에)
    ui/
      index.ts        # 공통 UI 컴포넌트 자리 (버튼, 인풋 등)
```

> **FSD 계층 의존 방향** (fsd.md 기준):
> `app/ → widgets → features → entities → shared` (위→아래만 허용)
> `app/` = Next.js 라우팅이 FSD의 pages 역할 겸함

---

## 3. tsconfig 변경 사항

### 현재 (변경 전)

```json
"paths": {
  "@/*": ["./*"]
}
```

### 목표 (변경 후)

```json
"paths": {
  "@/*": ["./*"],
  "@entities/*": ["./src/entities/*"],
  "@features/*": ["./src/features/*"],
  "@widgets/*":  ["./src/widgets/*"],
  "@shared/*":   ["./src/shared/*"]
}
```

> `@/*`는 루트 기준 그대로 유지 — `app/layout.tsx` 등 기존 import 깨지지 않음.
> FSD alias는 `src/` 내부 접근 전용으로 명확히 분리.

---

## 4. 각 index.ts placeholder 내용

모든 `index.ts`는 아래 형태로 시작:

```typescript
// TODO: 이 슬라이스의 public API를 여기서 re-export
// 예: export { PatientCard } from './ui/PatientCard'
//     export type { Patient } from './model/types'
export {};
```

> FSD 원칙: 외부는 `index.ts`를 통해서만 접근. 세그먼트 내부 파일을 직접 import하지 않음.

---

## 5. 구현 체크리스트

- [ ] `src/entities/patient/` 구조 생성 + `index.ts`
- [ ] `src/entities/caregiver/` 구조 생성 + `index.ts`
- [ ] `src/features/record-health-metric/` 구조 생성 + `index.ts`
- [ ] `src/features/match-visit-schedule/` 구조 생성 + `index.ts`
- [ ] `src/widgets/visit-record-timeline/` 구조 생성 + `index.ts`
- [ ] `src/shared/api/index.ts` 생성
- [ ] `src/shared/ui/index.ts` 생성
- [ ] `tsconfig.json` paths 업데이트
- [ ] `pnpm build` 통과 확인 (기존 app/ 코드 깨지지 않음)

---

## 6. 리스크 및 주의사항

| 리스크 | 대응 |
|--------|------|
| Next.js `app/` 라우팅과 FSD `src/` 혼재 | `app/`은 라우팅 전용, FSD 도메인 로직은 무조건 `src/` — 경계 문서화 |
| `@/*`가 루트를 가리켜 `app/`도 포함됨 | FSD alias(`@entities/*` 등)를 쓸 때는 명시적으로 사용, `@/*`는 app/ 접근용으로 암묵적 구분 |
| 빈 `export {}` 파일로 인한 빌드 경고 | Next.js 16 + TypeScript strict에서 빈 모듈은 문제없음 |
