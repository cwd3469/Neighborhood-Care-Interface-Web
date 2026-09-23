# [Plan] fastapi-backend-skeleton

> Milestone 2 — FastAPI 백엔드 골격 구현 계획

**작성일**: 2026-09-19
**Feature**: fastapi-backend-skeleton
**위치**: `systemNeighborhoodSeniorCare/backend/` (모노레포)

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 프론트엔드 `shared/api` 클라이언트가 호출할 FastAPI 서버가 없어 실제 데이터 흐름 불가 — `NEXT_PUBLIC_API_URL=http://localhost:8000` 연결 대상 없음 |
| **Solution** | uv + FastAPI + SQLAlchemy 2.x async + asyncpg + PyJWT 기반 모노레포 백엔드 골격 생성 — 도메인 핵심 로직(인증/인가)은 TODO로 남겨 직접 구현 |
| **Function UX Effect** | `GET /health` 200 OK로 프론트-백 연결 즉시 검증, `POST /auth/login` 뼈대로 JWT 흐름 이해 후 직접 채우기 |
| **Core Value** | async DB 세션 패턴 + JWT 직접 구현 이해 — "왜 async engine인가", "access/refresh token 분리 이유" 면접 설명 가능 |

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | `NEXT_PUBLIC_API_URL` 연결 대상 없음 → Milestone 3(도메인 API) 착수 불가 |
| **WHO** | FastAPI 처음 접하는 프론트 5년차 — 원리 위주 설명, 보일러플레이트만 AI 생성 |
| **RISK** | SQLAlchemy 2.x async 설정 복잡성 / Alembic async env.py 추가 설정 / JWT 구현 보안 버그 가능성 |
| **SUCCESS** | `GET /health` 200 OK + auth 라우터 뼈대 + TODO 주석 완성 + `uvicorn` 실행 성공 |
| **SCOPE** | 골격만 — 실제 도메인 API(환자/일정/FHIR)는 Milestone 3 대상 |

---

## 1. 배경 및 목적

현재 상태:
- `web/src/shared/api/` — `createApiClient(baseUrl)` 완료, `NEXT_PUBLIC_API_URL` 환경변수 설정 대기 중
- `api.setAuthToken(token)` stub 완료 — JWT 주입 준비됨
- 연결할 FastAPI 서버 없음

필요한 것:
- `http://localhost:8000`에서 응답하는 FastAPI 앱
- PostgreSQL 연결 (async)
- JWT 인증 엔드포인트 뼈대 (핵심 로직은 TODO)
- Alembic 마이그레이션 초기 설정

---

## 2. 요구사항

### R-01: 디렉토리 구조

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app 인스턴스, 라우터 등록
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── health.py    # GET /health
│   │       └── auth.py      # POST /api/v1/auth/register, /login
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py        # pydantic-settings 환경변수
│   │   └── security.py      # TODO: JWT 생성/검증 (직접 구현)
│   ├── db/
│   │   ├── __init__.py
│   │   ├── engine.py        # async engine + session factory
│   │   ├── base.py          # DeclarativeBase
│   │   └── models/
│   │       ├── __init__.py
│   │       └── user.py      # User 모델
│   └── schemas/
│       ├── __init__.py
│       └── auth.py          # RegisterRequest, LoginRequest, TokenResponse
├── alembic/
│   ├── env.py               # async 설정
│   └── versions/            # 마이그레이션 파일
├── alembic.ini
├── pyproject.toml
├── .env.example
└── README.md
```

### R-02: pyproject.toml (uv 기반)

핵심 의존성:
- `fastapi[standard]` >= 0.115
- `sqlalchemy[asyncio]` >= 2.0
- `asyncpg` — async PostgreSQL 드라이버
- `alembic` — DB 마이그레이션
- `pydantic-settings` — 환경변수 타입 안전 관리
- `pyjwt` — JWT 생성/검증
- `passlib[bcrypt]` — 비밀번호 해싱
- `python-dotenv`

개발 의존성: `ruff`, `pytest-asyncio`, `httpx`

### R-03: 환경변수 설정 (`app/core/config.py`)

```python
class Settings(BaseSettings):
    DATABASE_URL: str          # postgresql+asyncpg://...
    SECRET_KEY: str            # JWT 서명 키
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

settings = Settings()
```

`.env.example`:
```
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/seniorcare
SECRET_KEY=your-secret-key-here
```

### R-04: async DB 엔진 + 세션 (`app/db/engine.py`)

```python
engine = create_async_engine(settings.DATABASE_URL, echo=True)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
```

### R-05: Health Check

```
GET /health
→ 200 {"status": "ok", "version": "0.1.0"}
```

### R-06: 인증 라우터 뼈대 + TODO

```python
# POST /api/v1/auth/register
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # TODO: 중복 이메일 체크
    # TODO: 비밀번호 해싱 (passlib)
    # TODO: User DB 저장
    # TODO: access_token 반환
    raise NotImplementedError

# POST /api/v1/auth/login
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    # TODO: 이메일로 User 조회
    # TODO: 비밀번호 검증 (passlib verify)
    # TODO: JWT access + refresh token 생성 (security.py)
    # TODO: refresh token DB 저장 또는 쿠키 설정
    raise NotImplementedError
```

### R-07: Pydantic 스키마 (`app/schemas/auth.py`)

- `RegisterRequest`: email, password, name, role (guardian/caregiver/admin)
- `LoginRequest`: email, password
- `TokenResponse`: access_token, refresh_token, token_type

### R-08: User 모델 (`app/db/models/user.py`)

```python
class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(unique=True, index=True)
    hashed_password: Mapped[str]
    name: Mapped[str]
    role: Mapped[str]  # guardian | caregiver | admin
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
```

### R-09: Alembic async 설정

`alembic/env.py`에 async 실행 패턴 적용:
```python
async def run_async_migrations():
    async with engine.begin() as conn:
        await conn.run_sync(do_run_migrations)
```

첫 마이그레이션 파일 생성 (`create_users_table`)

### R-10: README.md (실행 방법)

```bash
# 설치
uv sync

# DB 실행 (Docker)
docker compose up -d db

# 마이그레이션
uv run alembic upgrade head

# 서버 실행
uv run uvicorn app.main:app --reload
```

---

## 3. 성공 기준 (Success Criteria)

| # | 기준 | 검증 방법 |
|---|------|----------|
| SC-01 | `uv sync` 성공 | 의존성 설치 오류 없음 |
| SC-02 | `uvicorn app.main:app --reload` 실행 성공 | 포트 8000 리스닝 |
| SC-03 | `GET /health` → 200 | curl 또는 브라우저 확인 |
| SC-04 | `/api/v1/auth/register` 라우터 등록 | `/docs` (Swagger) 에서 확인 |
| SC-05 | `/api/v1/auth/login` 라우터 등록 | `/docs` (Swagger) 에서 확인 |
| SC-06 | TODO 주석 완비 | 핵심 로직 직접 구현 가이드 포함 |
| SC-07 | Alembic 마이그레이션 `upgrade head` 성공 | users 테이블 생성 확인 |
| SC-08 | `web/` CORS 허용 | `localhost:3000` 요청 통과 |

---

## 4. 리스크

| 리스크 | 심각도 | 대응 |
|--------|--------|------|
| SQLAlchemy 2.x async 설정 오류 | 중 | 공식 문서 패턴 그대로 사용 |
| Alembic async env.py 복잡성 | 중 | `run_sync` wrapper 패턴 적용 |
| JWT 보안 미구현 상태로 테스트 | 저 | `NotImplementedError` raise로 명시적 표시 |
| Docker PostgreSQL 미설치 | 저 | README에 Docker Compose 포함 |

---

## 5. 범위 밖 (Out of Scope)

- 환자/요양사 도메인 API — Milestone 3
- FHIR Observation 매핑 — Milestone 3
- 실제 JWT 로직 구현 — 직접 구현 (TODO 안내만)
- 배포 설정 (Railway/Render) — Milestone 6
- 테스트 코드 — Milestone 7
