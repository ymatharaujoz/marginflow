# Database Package

Shared Drizzle schema and database access layer for MarginFlow.

## Local workflow

- Set `DATABASE_URL` to local Postgres for development.
- Generate SQL migrations with `corepack pnpm db:generate`.
- Apply migrations with `corepack pnpm db:migrate`.
- Seed local fixture data with `corepack pnpm db:seed`.
- Open Drizzle Studio with `corepack pnpm db:studio`.

## Production workflow

- Point `DATABASE_URL` at Supabase Postgres.
- Reuse same migration flow used in development.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` stay reserved for later app/service integration work. M4 uses `DATABASE_URL` as primary Drizzle connection.

## Rollback guidance

Migrations are forward-only. If a local migration must be undone, restore the database from a clean baseline or write and apply an explicit corrective SQL migration. Do not rely on generated down-migrations.
