# MarginFlow

MarginFlow is a financial management SaaS for marketplace sellers and small businesses. The current repository state is the **M0 foundation baseline**: strict TypeScript, ESLint, Prettier, Vitest, environment validation, CI, and project documentation aligned to the latest PRD.

## Target architecture

The current PRD defines a **separate frontend and backend** architecture inside a monorepo:

- `apps/web`: Next.js frontend deployed on Vercel
- `apps/api`: NestJS backend deployed on Render
- `packages/*`: shared TypeScript packages used by both apps

This repository is still in the pre-monorepo foundation phase. The root-level Next.js scaffold that exists today is a temporary M0 verification shell and will be reorganized during M1 and M2.

## Foundation stack

- Next.js App Router for the temporary M0 verification shell
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

- root scripts and CI for install, lint, typecheck, test, and build
- baseline docs under `docs/`
- a temporary `src/` verification scaffold used to prove the TypeScript and Next.js foundation works

The long-term repository shape from the PRD is:

- `apps/web`
- `apps/api`
- `packages/types`
- `packages/database`
- `packages/domain`
- `packages/validation`
- `packages/ui`
- `packages/eslint-config`
- `packages/tsconfig`

## Getting started

1. Enable Corepack if needed: `corepack enable`
2. Install dependencies: `corepack pnpm install`
3. Copy `.env.example` to `.env.local` and fill in the values you need
4. Start the temporary root verification app: `corepack pnpm dev`

The local app runs at `http://localhost:3000`.

## Commands

- `corepack pnpm dev` starts the local development server
- `corepack pnpm build` creates a production build
- `corepack pnpm start` starts the production server
- `corepack pnpm lint` runs ESLint
- `corepack pnpm typecheck` runs TypeScript without emitting files
- `corepack pnpm test` runs the Vitest suite
- `corepack pnpm format` formats the repository with Prettier
- `corepack pnpm format:check` checks formatting without writing

## Environment strategy

Runtime environment parsing lives in `src/lib/validation/env.ts`.

- `NEXT_PUBLIC_*` variables are treated as client-visible
- secrets stay server-only
- the repo ships `.env.example` as the canonical variable list for local setup

## Architecture rules

- Treat the latest `specs.md` as the source of truth over earlier implementation assumptions
- Keep framework entrypoints thin
- Avoid placing durable backend business logic inside Next.js route handlers
- Preserve reusable TypeScript modules so they can move into `packages/*` during M1
- Treat the root `src/` directory as transitional until the monorepo split is implemented

## Branching and PR conventions

- Create short-lived branches from `main` using the `codex/` prefix by default
- Keep PRs milestone-scoped or task-group-scoped
- Require CI to pass before merging
- Prefer small, reviewable commits with docs and tracker updates when milestones move

## CI

GitHub Actions runs install, lint, typecheck, test, and build for every push and pull request through `.github/workflows/ci.yml`. During M1, the root pipeline should evolve into workspace-aware commands rather than single-app commands.
