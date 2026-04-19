# Checkpoints

## Current Focus

- Active milestone: M1
- Active task: Configure pnpm workspaces
- Next task: Configure Turborepo and shared package boundaries
- Blockers: None
- Last completed checkpoint: M0

## Checkpoint M0

- Date: 2026-04-19
- Milestone: M0. Repository Foundation
- Summary of what shipped: established the repository baseline with strict TypeScript, ESLint, Prettier, Vitest, CI, root scripts, environment validation, and setup documentation
- Key files/modules added: `package.json`, `.github/workflows/ci.yml`, `README.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `src/lib/validation/env.ts`
- Tests added or updated: `src/lib/validation/env.test.ts`
- Known issues: the repo still contains a temporary root Next.js verification scaffold from the pre-monorepo direction and must be reorganized in M1 and M2
- Next recommended milestone: M1
- Next recommended task: Configure pnpm workspaces and establish the monorepo package boundaries
