# Checkpoints

## Current Focus

- Active milestone: M2
- Active task: Await user confirmation for M2 completion
- Next task: Start M3 API bootstrap after confirmation
- Blockers: None
- Last completed checkpoint: M1

## Checkpoint M0

- Date: 2026-04-19
- Milestone: M0. Repository Foundation
- Summary of what shipped: established the repository baseline with strict TypeScript, ESLint, Prettier, Vitest, CI, root scripts, environment validation, and setup documentation
- Key files/modules added: `package.json`, `.github/workflows/ci.yml`, `README.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `src/lib/validation/env.ts`
- Tests added or updated: `src/lib/validation/env.test.ts`
- Known issues: the repo still contains a temporary root Next.js verification scaffold from the pre-monorepo direction and must be reorganized in M1 and M2
- Next recommended milestone: M1
- Next recommended task: Configure pnpm workspaces and establish the monorepo package boundaries

## Checkpoint M1

- Date: 2026-04-19
- Milestone: M1. Monorepo and Shared Packages
- Summary of what shipped: converted the repository into a pnpm workspace monorepo with Turborepo orchestration, shared package boundaries, and minimal `apps/web` and `apps/api` stubs for cross-package validation
- Key files/modules added: `pnpm-workspace.yaml`, `turbo.json`, `apps/web`, `apps/api`, `packages/types`, `packages/validation`, `packages/domain`, `packages/database`, `packages/ui`, `packages/eslint-config`, `packages/tsconfig`
- Tests added or updated: workspace pipeline validation through `lint`, `typecheck`, `test`, and `build`; existing root env validation test retained
- Known issues: the root `src/` verification shell is still transitional and should be migrated or superseded during M2 and M3
- Next recommended milestone: M2
- Next recommended task: initialize the real Next.js frontend scaffold inside `apps/web`

## Checkpoint M2

- Date: 2026-04-19
- Milestone: M2. Frontend Web App Scaffold
- Summary of what shipped: replaced the temporary root-owned Next.js shell with a real `apps/web` App Router frontend, route-grouped marketing and app placeholders, shared UI primitives, frontend env helpers, a typed API client seam, and TanStack Query provider wiring
- Key files/modules added: `apps/web/src/app`, `apps/web/src/components/app-providers.tsx`, `apps/web/src/lib/api/client.ts`, `apps/web/src/lib/env.ts`, `packages/ui/src/button.tsx`, `packages/ui/src/card.tsx`, `packages/ui/src/container.tsx`
- Tests added or updated: `apps/web/src/lib/env.test.ts`, `apps/web/src/lib/api/client.test.ts`, root env validation test updated for `NEXT_PUBLIC_API_BASE_URL`; verified with `lint`, `typecheck`, `test`, `build`, and `pnpm --filter @marginflow/web dev`
- Known issues: protected app layout is intentionally a placeholder until M5; local dev may shift to port 3001 if port 3000 is already in use
- Next recommended milestone: M3
- Next recommended task: initialize the NestJS API scaffold in `apps/api` with module skeleton, health endpoint, and Render-ready boot flow
