# [Plan] next-eslint-prettier

> ESLint v9 flat config + Prettier 통합 — 코드 품질/포맷 자동화

**작성일**: 2026-09-25
**상태**: Plan 완료
**전제**: ESLint v9 flat config 기설정 (`eslint.config.mjs`), Prettier 미설치

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | Prettier 미설치 — 코드 스타일이 개발자마다 달라 일관성 없음. `pnpm lint`가 포맷을 검사하지 않음 |
| **Solution** | Prettier + `eslint-config-prettier` + `eslint-plugin-prettier` 설치, ESLint flat config에 통합 |
| **Function UX Effect** | `pnpm lint` 한 번으로 ESLint + Prettier 위반 모두 검사, `pnpm format`으로 자동 수정 |
| **Core Value** | 기존 `eslint.config.mjs` 구조 유지하며 최소 변경으로 포맷 자동화 완성 |

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 코드 스타일 불일치로 PR 리뷰 비용 증가, 포맷 관련 논쟁 제거 |
| **WHO** | 프론트 5년차 — ESLint v9 flat config 이미 적용 |
| **RISK** | 기존 ESLint 규칙과 Prettier 충돌 (eslint-config-prettier로 해결), 전체 파일 포맷 변경 발생 |
| **SUCCESS** | `pnpm lint` 에러 0, `pnpm format` 으로 전체 포맷 통일 |
| **SCOPE** | ESLint + Prettier 설정만 — VS Code 확장/Git hook(husky) 별도 |

---

## 1. 현재 상태

```
eslint.config.mjs   ✅ ESLint v9 flat config
.prettierrc          ❌ 없음
prettier             ❌ 미설치
eslint-config-prettier ❌ 미설치
eslint-plugin-prettier ❌ 미설치
```

---

## 2. 요구사항

### R-01: Prettier 설치

```bash
pnpm add -D prettier eslint-config-prettier eslint-plugin-prettier
```

### R-02: `.prettierrc` 생성 (기본값)

```json
{
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": false,
  "quoteProps": "as-needed",
  "trailingComma": "all",
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### R-03: `.prettierignore` 생성

```
.next/
out/
build/
node_modules/
pnpm-lock.yaml
*.min.js
```

### R-04: `eslint.config.mjs` 업데이트

기존 `nextVitals` + `nextTs` 에 Prettier 통합 추가:

```js
import prettier from 'eslint-plugin-prettier/recommended'

// defineConfig 배열 마지막에 추가
...prettier  // eslint-config-prettier(충돌 규칙 비활성) + eslint-plugin-prettier(포맷 위반 → ESLint 에러)
```

> `eslint-plugin-prettier/recommended`는 `eslint-config-prettier` + `plugin:prettier/recommended` 한 번에 적용.

### R-05: `package.json` scripts 추가

```json
"format": "prettier --write ."
"format:check": "prettier --check ."
```

---

## 3. 파일 계획

```
신규 2개:
  .prettierrc
  .prettierignore

수정 2개:
  eslint.config.mjs   — prettier 플러그인 추가
  package.json        — format 스크립트 추가
```

---

## 4. 적용 규칙

| 규칙 | 값 | 이유 |
|------|----|------|
| printWidth | 80 | 기본값 |
| singleQuote | false | 기존 코드 `"` 스타일 유지 |
| semi | true | 기본값 |
| trailingComma | all | 깔끔한 diff |
| endOfLine | lf | 크로스 플랫폼 일관성 |

---

## 5. 에러 처리 / 충돌 방지

| 문제 | 해결 |
|------|------|
| ESLint `quotes` 규칙 vs Prettier `singleQuote` 충돌 | `eslint-config-prettier`가 ESLint 포맷 규칙 비활성화 |
| 기존 파일 포맷 변경 | `pnpm format` 한 번 실행으로 일괄 정리 |
| next lint 규칙 유지 | `nextVitals`, `nextTs` 먼저 적용 후 prettier 마지막에 추가 |

---

## 6. Success Criteria

| # | 기준 | 검증 |
|---|------|------|
| SC-01 | `pnpm lint` — ESLint + Prettier 위반 모두 에러로 표시 | 포맷 틀린 파일에서 에러 확인 |
| SC-02 | `pnpm format` — 전체 파일 자동 포맷 | 실행 후 변경 파일 확인 |
| SC-03 | `pnpm format:check` — CI용 포맷 검사 (수정 없이) | 0 exit code 확인 |
| SC-04 | `pnpm tsc --noEmit` 에러 없음 | TypeScript 영향 없음 |
| SC-05 | 기존 `nextVitals`, `nextTs` 규칙 유지 | `pnpm lint` 기존 에러 동일 |

---

## 7. 범위 밖

- VS Code `settings.json` 에디터 설정
- husky + lint-staged (Git hook)
- Stylelint (CSS 포맷)
- 팀 컨벤션 문서화

---

## 8. 다음 단계

- `/pdca design next-eslint-prettier`
