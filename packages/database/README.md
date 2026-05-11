# Database Package

Shared Drizzle schema and database access layer for MarginFlow.

## Local workflow

- Point `DATABASE_URL` at Supabase dev pooled/runtime Postgres.
- Point `DATABASE_MIGRATION_URL` at Supabase dev direct or migration-safe Postgres.
- Generate SQL migrations with `corepack pnpm db:generate`.
- Apply migrations with `corepack pnpm db:migrate`.
- Seed local fixture data with `corepack pnpm db:seed`.
- Open Drizzle Studio with `corepack pnpm db:studio`.

## Production workflow

- Point `DATABASE_URL` at Supabase prod pooled/runtime Postgres.
- Point `DATABASE_MIGRATION_URL` at Supabase prod direct or migration-safe Postgres.
- Reuse same migration flow used in development.
- Runtime code uses `DATABASE_URL`; Drizzle tooling prefers `DATABASE_MIGRATION_URL` and falls back to `DATABASE_URL` when the migration URL is omitted.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` stay optional and reserved for later app/service integration work.

## Rollback guidance

Migrations are forward-only. If a local migration must be undone, restore the database from a clean baseline or write and apply an explicit corrective SQL migration. Do not rely on generated down-migrations.
