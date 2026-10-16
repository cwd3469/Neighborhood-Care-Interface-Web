# [Plan] cicd

> GitHub Actions + Vercel CI/CD 파이프라인 구축 (프론트엔드)

**작성일**: 2026-10-16
**상태**: Plan 완료

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 수동 배포 — `pnpm build` 로컬 확인 없이 main 브랜치 직접 푸시 → 빌드 실패가 프로덕션에 바로 반영될 위험 |
| **Solution** | GitHub Actions로 PR 단계에서 lint/tsc/build 자동 검증, Vercel GitHub 연동으로 자동 Preview/Production 배포 |
| **Function UX Effect** | PR 생성 시 자동 검증 + Preview URL 발급. main 머지 시 프로덕션 자동 배포 |
| **Core Value** | 배포 안전망 — 깨진 빌드가 프로덕션에 나가지 않음, PR마다 미리보기 URL |

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 수동 배포 → 빌드 미검증 프로덕션 반영 위험 |
| **WHO** | 개발팀 전체 — PR 작성자, 리뷰어 |
| **RISK** | Vercel 환경변수(API_URL 등) 미설정 시 빌드 성공해도 런타임 오류 / pnpm 버전 불일치 |
| **SUCCESS** | PR 시 CI 통과 배지 + Preview URL 발급. main 머지 시 프로덕션 자동 배포 |
| **SCOPE** | `.github/workflows/ci.yml` + Vercel 프로젝트 연동 설정. 테스트 프레임워크 도입 없음 |

---

## 1. 아키텍처

```
PR 오픈/업데이트
  → GitHub Actions: ci.yml
      ├─ pnpm install
      ├─ pnpm lint
      ├─ pnpm tsc --noEmit
      └─ pnpm build
          ✅ 통과 → PR에 체크 표시
          ❌ 실패 → PR 머지 차단

main 머지
  → Vercel (GitHub 연동)
      → 자동 프로덕션 배포

PR 브랜치
  → Vercel
      → 자동 Preview 배포 + URL 코멘트
```

---

## 2. 요구사항

### R-01: `.github/workflows/ci.yml` — CI 워크플로우

트리거: `push` (main), `pull_request` (main)

스텝:
1. `actions/checkout@v4`
2. `pnpm/action-setup@v4` (pnpm 설치)
3. `actions/setup-node@v4` (Node.js 버전 고정)
4. `pnpm install --frozen-lockfile`
5. `pnpm lint`
6. `pnpm tsc --noEmit`
7. `pnpm build`

### R-02: Vercel 연동

- Vercel 프로젝트 생성 + GitHub 레포 연결
- 환경변수 설정: `API_URL`, `NEXT_PUBLIC_API_URL` 등
- Branch → Production: `main`
- PR 브랜치 → Preview 자동 배포

### R-03: `package.json` — Node/pnpm 버전 고정

```json
"engines": {
  "node": ">=20",
  "pnpm": ">=9"
}
```

---

## 3. 파일 계획

```
신규:
.github/workflows/ci.yml   ← R-01

수정:
package.json               ← R-03 (engines 추가)

Vercel 설정 (웹 콘솔):
- 프로젝트 연결 + 환경변수   ← R-02
```

---

## 4. 성공 기준

| # | 기준 | 검증 |
|---|------|------|
| SC-01 | PR 오픈 시 GitHub Actions CI 자동 실행 | GitHub PR 확인 |
| SC-02 | lint/tsc/build 중 하나라도 실패 시 CI 실패 | 의도적 오류 테스트 |
| SC-03 | main 머지 시 Vercel 프로덕션 자동 배포 | Vercel 대시보드 확인 |
| SC-04 | PR 브랜치에 Preview URL 자동 발급 | PR 코멘트 확인 |

---

## 5. 리스크

| 리스크 | 심각도 | 대응 |
|--------|--------|------|
| Vercel 환경변수 미설정 → 런타임 오류 | 중 | 배포 후 환경변수 체크리스트 운영 |
| `pnpm-lock.yaml` 없이 `--frozen-lockfile` 실패 | 저 | lock 파일 커밋 확인 |
| Next.js 빌드 시 `API_URL` 없어도 성공 | 저 | 빌드는 통과, 런타임에서만 오류 — 허용 |

---

## 6. Vercel 환경변수 목록

배포 후 Vercel 콘솔에서 설정 필요:

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `API_URL` | FastAPI 서버 URL (서버사이드) | `https://api.example.com` |

---

## 7. 다음 단계

바로 구현 가능 — `.github/workflows/ci.yml` 작성 + `package.json` engines 추가
Vercel 연동은 웹 콘솔에서 직접 진행 필요
