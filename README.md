# MarginFlow

MarginFlow is a financial management SaaS for marketplace sellers and small businesses. The current repository state is the **M2 frontend scaffold**: pnpm workspaces, Turborepo orchestration, a real Next.js web app in `apps/web`, shared packages, and a still-minimal backend stub in `apps/api`.

## Target architecture

The current PRD defines a **separate frontend and backend** architecture inside a monorepo:

- `apps/web`: Next.js frontend deployed on Vercel
- `apps/api`: NestJS backend deployed on Render
- `packages/*`: shared TypeScript packages used by both apps

This repository now contains the monorepo boundaries required by the PRD, and `apps/web` is the only active frontend runtime entrypoint.

## Repository stack

- pnpm workspaces
- Turborepo
- Next.js App Router in `apps/web`
- React
- TypeScript with `strict` mode
- Tailwind CSS v4
- ESLint
- Prettier
- Vitest
- Zod for runtime validation
- pnpm as the package manager

## Current repository state

The repository currently contains:

- root workspace orchestration scripts and CI
- `apps/web` as the active frontend app
- `apps/api` as the M1 stub for the upcoming NestJS scaffold
- `packages/types`
- `packages/database`
- `packages/domain`
- `packages/validation`
- `packages/ui`
- `packages/eslint-config`
- `packages/tsconfig`
- baseline docs under `docs/`
- root utility and validation files used by repository-level checks

## Getting started

1. Enable Corepack if needed: `corepack enable`
2. Install dependencies: `corepack pnpm install`
3. Copy `.env.example` to `.env.local` and fill in the values you need
4. Run the workspace pipeline as needed:
   - `corepack pnpm dev` for workspace development commands
   - `corepack pnpm dev:web` to run the Next.js frontend from `apps/web`

The frontend usually runs at `http://localhost:3000`, but Next.js will move to another free port such as `3001` when needed.

## Commands

- `corepack pnpm dev` runs workspace-level dev commands
- `corepack pnpm dev:web` starts the web frontend
- `corepack pnpm build` runs the workspace build pipeline
- `corepack pnpm start` starts the production web server
- `corepack pnpm lint` runs workspace lint plus root validation lint
- `corepack pnpm typecheck` runs workspace typechecks plus root validation typecheck
- `corepack pnpm test` runs workspace test hooks plus the root Vitest suite
- `corepack pnpm format` formats the repository with Prettier
- `corepack pnpm format:check` checks formatting without writing

## Environment strategy

Runtime environment parsing is owned by `packages/validation`, with `apps/web` consuming the shared public env validator and the root validation tests re-exporting through `src/lib/validation/env.ts`.

- `NEXT_PUBLIC_*` variables are treated as client-visible
- `NEXT_PUBLIC_API_BASE_URL` configures the frontend API base for NestJS communication
- secrets stay server-only
- the repo ships `.env.example` as the canonical variable list for local setup

## Architecture rules

- Treat the latest `specs.md` as the source of truth over earlier implementation assumptions
- Keep framework entrypoints thin
- Avoid placing durable backend business logic inside Next.js route handlers
- Keep reusable TypeScript modules in `packages/*` where they can be consumed by both apps
- Treat `apps/web` as the only active frontend runtime entrypoint

## Branching and PR conventions

- Create short-lived branches from `main` using the `codex/` prefix by default
- Keep PRs milestone-scoped or task-group-scoped
- Require CI to pass before merging
- Prefer small, reviewable commits with docs and tracker updates when milestones move

## CI

GitHub Actions runs install, lint, typecheck, test, and build for every push and pull request through `.github/workflows/ci.yml`, using the workspace-aware root scripts updated through M2.
