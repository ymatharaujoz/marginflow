# MarginFlow

MarginFlow is a financial management SaaS for marketplace sellers and small businesses. The current repository state is the **M1 monorepo baseline**: pnpm workspaces, Turborepo orchestration, shared packages, minimal app stubs, and a still-temporary root verification shell carried forward from M0.

## Target architecture

The current PRD defines a **separate frontend and backend** architecture inside a monorepo:

- `apps/web`: Next.js frontend deployed on Vercel
- `apps/api`: NestJS backend deployed on Render
- `packages/*`: shared TypeScript packages used by both apps

This repository now contains the monorepo boundaries required by the PRD. The root-level Next.js scaffold still exists as transitional verification code and will be migrated or replaced during M2 and M3.

## Repository stack

- pnpm workspaces
- Turborepo
- Next.js App Router for the temporary root verification shell
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
- `apps/web`
- `apps/api`
- `packages/types`
- `packages/database`
- `packages/domain`
- `packages/validation`
- `packages/ui`
- `packages/eslint-config`
- `packages/tsconfig`
- baseline docs under `docs/`
- a temporary root `src/` verification scaffold retained as migration source material

## Getting started

1. Enable Corepack if needed: `corepack enable`
2. Install dependencies: `corepack pnpm install`
3. Copy `.env.example` to `.env.local` and fill in the values you need
4. Run the workspace pipeline as needed:
   - `corepack pnpm dev` for workspace stub development commands
   - `corepack pnpm dev:root-shell` to run the temporary root Next.js verification app

The temporary root app runs at `http://localhost:3000` when using `dev:root-shell`.

## Commands

- `corepack pnpm dev` runs workspace-level dev commands
- `corepack pnpm dev:root-shell` starts the temporary root verification app
- `corepack pnpm build` runs the workspace build pipeline and the root shell build
- `corepack pnpm start` starts the production server
- `corepack pnpm lint` runs workspace lint plus root lint
- `corepack pnpm typecheck` runs workspace typechecks plus root typecheck
- `corepack pnpm test` runs workspace test hooks plus the root Vitest suite
- `corepack pnpm format` formats the repository with Prettier
- `corepack pnpm format:check` checks formatting without writing

## Environment strategy

Runtime environment parsing is now owned by `packages/validation`, with the root shell re-exporting the shared validator through `src/lib/validation/env.ts`.

- `NEXT_PUBLIC_*` variables are treated as client-visible
- secrets stay server-only
- the repo ships `.env.example` as the canonical variable list for local setup

## Architecture rules

- Treat the latest `specs.md` as the source of truth over earlier implementation assumptions
- Keep framework entrypoints thin
- Avoid placing durable backend business logic inside Next.js route handlers
- Keep reusable TypeScript modules in `packages/*` where they can be consumed by both apps
- Treat the root `src/` directory as transitional until the real frontend and backend scaffolds replace it

## Branching and PR conventions

- Create short-lived branches from `main` using the `codex/` prefix by default
- Keep PRs milestone-scoped or task-group-scoped
- Require CI to pass before merging
- Prefer small, reviewable commits with docs and tracker updates when milestones move

## CI

GitHub Actions runs install, lint, typecheck, test, and build for every push and pull request through `.github/workflows/ci.yml`, using the workspace-aware root scripts introduced in M1.
