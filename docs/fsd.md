# Feature-Sliced Design (FSD) 정리

## 한 줄 정의
코드를 "무엇을 하는 코드인가"(기술 계층)가 아니라 **"어떤 비즈니스 도메인/기능인가"** 기준으로 나누는 프론트엔드 폴더 구조 방법론.

`components/`, `hooks/`, `services/`처럼 기술별로 묶는 대신, `entities/`, `features/`, `widgets/`처럼 도메인 단위로 묶고, 그 안에서만 다시 기술적 역할(ui/model/api)로 세분화한다.

## 3단계 구조

| 단계 | 역할 | 비유 |
|---|---|---|
| **Layer** (계층) | 앱 전체를 가로지르는 책임 범위 | 조직도의 부서 |
| **Slice** (슬라이스) | 계층 안에서 도메인별로 나눈 것 | 부서 안 팀 |
| **Segment** (세그먼트) | 슬라이스 안에서 기술 역할별 폴더 | 팀 안 업무(기획/실행/보고) |

## 계층 (Layer) — 위에서 아래 순서

```
app/          → 전역 설정: provider, router, 전역 스타일, 전역 상태
pages/        → 라우팅 단위 전체 화면
widgets/      → 여러 feature/entity를 조합한 독립적 UI 블록
features/     → 사용자 행동 단위 (버튼 누르면 일어나는 일)
entities/     → 비즈니스 도메인 객체 (User, Product 등)
shared/       → 도메인 무관 공통 코드 (UI kit, API client, utils)
```

> **참고**: 예전엔 `pages`와 `widgets` 사이에 `processes` 계층이 있었지만, 공식 문서(feature-sliced.design)에서 현재 취소선 처리되어 있음(사실상 deprecated). 새 프로젝트에서 쓸 필요 없음.

각 계층 안에서 도메인별 폴더(slice)를 만들고, 그 안에 `ui/`, `model/`, `api/`(필요시 `lib/`, `config/`) 세그먼트를 둔다.

```
features/
  visit-scheduling/
    ui/        # 일정 등록 폼 컴포넌트
    model/     # 상태, 훅
    api/       # 이 feature 전용 API 호출
```

## 핵심 규칙

**상위 계층만 하위 계층을 import할 수 있다.** 역방향 금지, 같은 계층 내 슬라이스끼리도 금지(entities끼리는 예외적으로 허용하는 경우 있음).

```
pages → widgets → features → entities → shared   (O, 위→아래)
entities → features                                (X, 역방향 금지)
features/visit-scheduling → features/auth           (X, 같은 계층 슬라이스 간 금지)
```

이 규칙 덕분에 "이 파일이 뭘 알아도 되는지"가 폴더 위치만 봐도 결정됨 — 대규모 프로젝트에서 순환 의존/스파게티 방지가 FSD가 해결하는 핵심 문제.

## 적용 예시 (시니어 케어 프로젝트 / Next.js App Router)

```
app/                      # Next.js 라우팅 (FSD의 pages 역할 겸함)
  (dashboard)/...
src/
  widgets/
    visit-record-timeline/    # 방문기록 이력 위젯
  features/
    record-health-metric/     # 건강수치 입력 기능
    match-visit-schedule/     # 방문 일정 매칭
  entities/
    patient/                  # 환자 도메인 (FHIR Observation 매핑 로직 위치)
    caregiver/
  shared/
    api/                      # FastAPI 클라이언트, fetch wrapper
    ui/                       # 버튼, 인풋 등 공통 UI kit
```

FHIR `Observation` 매핑처럼 여러 feature에서 재사용되는 도메인 지식은 `entities/patient/model/`에 둔다 — feature마다 중복 구현 방지.

## 실무 어필 포인트

단순히 "폴더 나눴다"가 아니라, **계층 간 의존성 규칙 위반을 ESLint(`steiger` 린터 또는 `eslint-plugin-boundaries`)로 강제해서 순환 의존을 CI에서 차단했다**는 식으로 "왜 이 구조가 협업/스케일링 문제를 해결하는지" 설명할 수 있어야 면접에서 설득력이 있음.

## 출처
- [Feature-Sliced Design 공식 문서](https://feature-sliced.design/docs/get-started/overview)
- [FSD Overview (fsd.how)](https://fsd.how/docs/get-started/overview/)