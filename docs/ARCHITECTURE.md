# Architecture

## Source of truth

PRD version 2.0 supersedes the earlier single-app assumption. The target V1 architecture is now:

- `apps/web`: Next.js frontend on Vercel
- `apps/api`: NestJS backend on Render
- `packages/*`: shared TypeScript packages for contracts, validation, database access, config, and UI

## Current implementation state

M3 established both real app shells:

- `apps/web` is the active Next.js frontend runtime
- `apps/api` is the active NestJS Fastify backend runtime
- `packages/*` hold the first shared ownership boundaries
- the root `src/` area now exists only for repository-level validation helpers

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

The next architectural step is M4: add shared database and schema foundations that both app scaffolds can consume. Authentication, billing, and integrations should build on the existing `apps/api` seam rather than creating new HTTP entrypoints elsewhere.
