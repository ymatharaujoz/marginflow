# Checkpoints

## Current Focus

- Active milestone: M10
- Active task: validate the live Mercado Livre connection flow in `/app/integrations`, then continue with the first real sync pass for M11 and the imported-product review flow in `/app/products`
- Next task: complete Mercado Livre callback verification, run a real sync, confirm same-window blocking, verify refreshed metrics on `/app`, and review at least one synced product import/link action in `/app/products`
- Blockers: M5 and M6 are now cleared by local browser verification; honest closure is still pending on M10 callback validation, M11 real sync validation, imported-product live review validation, and explicit user confirmation if M12 should be considered done. Local Mercado Livre verification may require a stable ngrok callback URL that points to the local API while keeping web auth and app routing on localhost
- Last completed checkpoint: M6

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

## Checkpoint M3

- Date: 2026-04-20
- Milestone: M3. Backend API Scaffold on Render
- Summary of what shipped: replaced the API stub with a real NestJS Fastify scaffold, health module, app bootstrap/config seams, global exception and Zod validation strategy, explicit CORS baseline, local/runtime env parsing, and Render-ready API docs and commands
- Key files/modules added: `apps/api/src/main.ts`, `apps/api/src/app.ts`, `apps/api/src/app.module.ts`, `apps/api/src/modules/health`, `apps/api/src/common`, `apps/api/README.md`
- Tests added or updated: `apps/api/src/modules/health/health.test.ts`; verified with `lint`, `typecheck`, `test`, `build`, and `pnpm --filter @marginflow/api start`
- Known issues: local API start currently fails with `EADDRINUSE` if port `4000` is already occupied; auth, billing, and database wiring are intentionally deferred to later milestones
- Next recommended milestone: M4
- Next recommended task: configure shared database package, Drizzle workflow, and first organization-scoped schema baseline

## Checkpoint M4

- Date: 2026-04-21
- Milestone: M4. Database and Schema
- Summary of what shipped: converted `packages/database` into the shared Drizzle/Postgres source of truth with full organization-scoped schema coverage, generated initial SQL migration assets, local seed workflow, and a Nest database provider seam in the API
- Key files/modules added: `packages/database/src/schema.ts`, `packages/database/drizzle.config.ts`, `packages/database/drizzle/0000_small_dazzler.sql`, `packages/database/src/seed.ts`, `apps/api/src/infra/database/database.module.ts`, `apps/api/src/common/config/api-env.test.ts`
- Tests added or updated: `packages/database/src/schema.test.ts`, `packages/database/src/drizzle-config.test.ts`, `apps/api/src/common/config/api-env.test.ts`, `apps/api/src/modules/health/health.test.ts`; verified with `lint`, `typecheck`, `test`, `build`, and migration generation
- Known issues: local `db:migrate` and `db:seed` depend on valid Postgres credentials in `DATABASE_URL`; milestone completion accepted by user despite local auth mismatch during agent verification
- Next recommended milestone: M5
- Next recommended task: install Better Auth in `apps/api`, connect it to the new Drizzle schema baseline, and start protected access control wiring

## Checkpoint M5

- Date: 2026-05-01
- Milestone: M5. Authentication and Access Control
- Summary of what shipped: Better Auth remained integrated across web and API, and the previously pending live verification gate was cleared with a successful local Google login, protected platform access, and sign-out validation
- Key files/modules added: existing auth surface reused across `apps/api/src/modules/auth`, `apps/web/src/app/(marketing)/sign-in`, and protected app routing in `apps/web/src/app/(app)/app`
- Tests added or updated: prior repo verification already passed; milestone closure is now backed by the user's real browser pass for sign-in, session use, protected access, and sign-out
- Known issues: no code blockers remain on M5
- Next recommended milestone: M6
- Next recommended task: keep the validated auth baseline and continue with billing verification and closure

## Checkpoint M6

- Date: 2026-05-01
- Milestone: M6. Billing and Entitlements
- Summary of what shipped: the previously blocked billing milestone was cleared through a real local Stripe payment flow that unlocked the platform and confirmed subscription-gated access release
- Key files/modules added: existing billing surface reused across `apps/api/src/modules/billing`, `/app/billing`, and protected `/app` entitlement routing
- Tests added or updated: prior repo verification already passed; milestone closure is now backed by the user's real browser pass for checkout and paid access unlock
- Known issues: no code blockers remain on M6
- Next recommended milestone: M10
- Next recommended task: validate Mercado Livre callback end to end, then move into the first real sync verification path for M11
