# Architecture

## Source of truth

PRD version 2.0 supersedes the earlier single-app assumption. The target V1 architecture is now:

- `apps/web`: Next.js frontend on Vercel
- `apps/api`: NestJS backend on Render
- `packages/*`: shared TypeScript packages for contracts, validation, database access, config, and UI

## Current implementation state

M1 established the actual workspace boundaries:

- `apps/web` and `apps/api` now exist as minimal package-resolution stubs
- `packages/*` now hold the first shared ownership boundaries
- the old root `src/` shell still exists only as transitional verification code

## Target project boundaries

- `apps/web`: marketing site, dashboard UI, rendering concerns, frontend env handling, and API consumption
- `apps/api`: controllers, modules, webhooks, integrations, auth, billing, and domain orchestration
- `packages/types`: shared DTOs and response contracts
- `packages/database`: database schema and access helpers
- `packages/domain`: reusable financial logic
- `packages/validation`: Zod schemas and validation helpers
- `packages/ui`: reusable frontend UI primitives
- `packages/eslint-config`: shared lint rules
- `packages/tsconfig`: shared TypeScript base configs

## Current shared-package intent

- `packages/types`: shared response and contract primitives used by the root shell and both app stubs
- `packages/validation`: shared Zod-based env validation used across the workspace
- `packages/domain`: framework-agnostic domain placeholder boundary for later financial logic
- `packages/database`: shared database ownership boundary for future schema and access code
- `packages/ui`: frontend-oriented shared package boundary for reusable UI primitives
- `packages/eslint-config`: reusable lint config variants for root, packages, and stubs
- `packages/tsconfig`: reusable TypeScript base configs for root, packages, web, and api

## Architectural rules

- `specs.md` is authoritative when code and older docs disagree
- framework entrypoints stay thin
- frontend must consume backend APIs rather than duplicate business logic
- financial calculations live in reusable domain modules
- integration code stays behind provider boundaries
- Next.js route handlers are not the permanent API layer for this project

## Transition note

The next architectural step is M2: replace the `apps/web` stub with the real Next.js frontend scaffold. M3 should then replace the `apps/api` stub with the real NestJS backend scaffold. The root shell remains temporary until those milestones absorb or supersede it.
