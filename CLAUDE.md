# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
pnpm dev        # Start dev server at localhost:3000
pnpm build      # Production build
pnpm start      # Start production server
pnpm lint       # Run ESLint
```

No test framework is configured yet.

## Stack

- **Next.js 16** with App Router (`app/` directory)
- **React 19**
- **TypeScript** (strict mode, `moduleResolution: bundler`)
- **Tailwind CSS v4** — uses `@import "tailwindcss"` and `@theme inline {}`, not the v3 directives
- **ESLint v9** flat config via `eslint.config.mjs`
- **pnpm** as package manager

## Key Conventions

**Path alias**: `@/*` resolves from the project root (e.g. `@/app/...`, `@/components/...`).

**Layout props**: Next.js 16 introduces `LayoutProps<"/path">` instead of `{ children: React.ReactNode }`. See `app/layout.tsx` for usage.

**Tailwind v4**: Theme customization uses CSS variables inside `@theme inline {}` in `globals.css`, not `tailwind.config`. No `tailwind.config.ts` file is needed or expected.

**Fonts**: Geist Sans and Geist Mono are loaded via `next/font/google` and exposed as CSS variables `--font-geist-sans` / `--font-geist-mono`.

## Architecture

```
app/             # Next.js App Router — routing only (FSD "pages" role)
src/             # FSD domain layers
  entities/      # Business domain objects (patient, caregiver)
  features/      # User action units (record-health-metric, match-visit-schedule)
  widgets/       # Composed UI blocks (visit-record-timeline)
  shared/        # Domain-agnostic code (api client, ui kit)
public/          # Static assets
```

Pages and layouts live under `app/`. When adding routes, use the Next.js App Router file conventions (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, etc.).

Before writing Next.js-specific code, consult `node_modules/next/dist/docs/` — Next.js 16 has breaking changes from earlier versions.

## FSD Architecture

`src/` uses Feature-Sliced Design. Import rules:

```
app/ → widgets → features → entities → shared   (top-down only)
```

- Each slice exposes its public API through `index.ts` only — never import from segment paths directly (e.g. `@entities/patient/ui/PatientCard`)
- Same-layer slice imports are forbidden (e.g. `features/A` cannot import `features/B`)
- Path aliases: `@entities/*`, `@features/*`, `@widgets/*`, `@shared/*` (all resolve from `src/`)
- `@/*` still resolves from the project root (for `app/` access)

## 참고 문서 (필요시 읽을 것)

- docs/project-plan.md — 전체 로드맵/일정
- docs/fsd.md — 아키텍쳐
