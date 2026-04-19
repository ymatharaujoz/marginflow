# Decisions

## M0 repository decisions

- PRD source of truth: version 2.0 overrides the earlier single-app direction
- Repository baseline: keep M0 focused on root-level tooling, CI, docs, and validation rather than committing to the final app layout
- Package manager: pnpm, invoked through Corepack for consistent local and CI behavior
- Path alias: `@/*` maps to `src/*`
- Formatting strategy: Prettier is the canonical formatter for repository-wide consistency
- Testing baseline: Vitest for fast TypeScript-first unit coverage during foundation work
- Temporary implementation note: the current root `src/` scaffold is a verification shell that should be reorganized during monorepo work, not treated as the final production structure
