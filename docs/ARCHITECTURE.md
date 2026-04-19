# Architecture

## Source of truth

PRD version 2.0 supersedes the earlier single-app assumption. The target V1 architecture is now:

- `apps/web`: Next.js frontend on Vercel
- `apps/api`: NestJS backend on Render
- `packages/*`: shared TypeScript packages for contracts, validation, database access, config, and UI

## Current implementation state

M0 established repository-wide tooling and a temporary root-level verification shell so the baseline could be validated quickly. That root scaffold is not the intended long-term production layout and should be treated as transitional.

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

## Architectural rules

- `specs.md` is authoritative when code and older docs disagree
- framework entrypoints stay thin
- frontend must consume backend APIs rather than duplicate business logic
- financial calculations live in reusable domain modules
- integration code stays behind provider boundaries
- Next.js route handlers are not the permanent API layer for this project

## Transition note

The next architectural step is M1: establish the actual monorepo shape and shared packages. M2 and M3 should then migrate the temporary root verification scaffold into `apps/web` and create the NestJS backend in `apps/api`.
