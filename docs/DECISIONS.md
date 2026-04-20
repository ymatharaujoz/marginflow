# Decisions

## M0 repository decisions

- PRD source of truth: version 2.0 overrides the earlier single-app direction
- Repository baseline: keep M0 focused on root-level tooling, CI, docs, and validation rather than committing to the final app layout
- Package manager: pnpm, invoked through Corepack for consistent local and CI behavior
- Path alias: `@/*` maps to `src/*`
- Formatting strategy: Prettier is the canonical formatter for repository-wide consistency
- Testing baseline: Vitest for fast TypeScript-first unit coverage during foundation work
- Temporary implementation note: the current root `src/` scaffold is a verification shell that should be reorganized during monorepo work, not treated as the final production structure

## M1 monorepo decisions

- Workspace manager: pnpm workspaces
- Task orchestrator: Turborepo, invoked through root workspace-aware scripts
- App strategy in M1: minimal `apps/web` and `apps/api` stubs only, so package consumption is validated without prematurely implementing M2 or M3
- Shared package set for M1: `types`, `database`, `domain`, `validation`, `ui`, `eslint-config`, and `tsconfig`
- Transitional root strategy: keep the existing root shell operational while moving clearly reusable code into shared packages

## M2 frontend decisions

- Route-organization strategy: keep Next.js route groups such as `(marketing)` and `(app)` because they separate layouts without affecting URL paths
- Frontend runtime ownership: `apps/web` is the only active frontend entrypoint; root Next runtime files are retired
- Client data strategy: establish TanStack Query provider and typed API client seam before product data screens exist
- UI sharing strategy: basic reusable primitives live in `packages/ui` for internal reuse across frontend surfaces

## M3 backend decisions

- Backend framework: NestJS with Fastify adapter
- Runtime validation direction: keep Zod-based request validation seam in `apps/api/common/pipes`, even before DTO-heavy endpoints exist
- CORS baseline: credentialed requests are allowed only from explicit `WEB_APP_ORIGIN`
- Deployment baseline: Render start flow uses `corepack pnpm --filter @marginflow/api start`, with `/health` as health-check path
- Scope limit: auth, billing, and database connectivity stay out of M3 so the API scaffold stays clean and bootable
