# API App

NestJS + Fastify backend for MarginFlow.

## Local commands

- `corepack pnpm --filter @marginflow/api dev`
- `corepack pnpm --filter @marginflow/api build`
- `corepack pnpm --filter @marginflow/api start`
- `corepack pnpm --filter @marginflow/api test`
- `corepack pnpm ngrok:mercadolivre:callback`
- `corepack pnpm ngrok:mercadolivre:callback:url`

## Local environment loading

Local runtime keeps reading `.env`, `.env.local`, and development overrides from the monorepo root.
`apps/api/.env.example` is only a deploy template/reference for Railway.

## Railway deploy baseline

This app is deployed as its own Railway service while still using the monorepo root for install/build.

- Config file: `/apps/api/railway.toml`
- Build command: `corepack enable && corepack pnpm install --frozen-lockfile && corepack pnpm --filter @marginflow/api build`
- Start command: `corepack pnpm --filter @marginflow/api start`
- Health check path: `/health`

Important:

- Keep repository root available during build because API depends on workspace packages.
- Railway injects `PORT`; `readApiEnv()` already falls back from `API_PORT` to `PORT`.
- Current production runtime intentionally stays on `tsx src/main.ts`; this cycle does not switch to `dist`.

## Runtime environment

Required in production:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `WEB_APP_ORIGIN`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_MONTHLY`
- `STRIPE_PRICE_ANNUAL`

Optional but recommended:

- `DATABASE_MIGRATION_URL`
- `API_DB_POOL_MAX`
- `AUTH_TRUSTED_ORIGINS`

Optional only when Mercado Livre integration is enabled:

- `MERCADOLIVRE_CLIENT_ID`
- `MERCADOLIVRE_CLIENT_SECRET`
- `MERCADOLIVRE_REDIRECT_URI`

Optional local/testing helper:

- `SYNC_RELAX_GUARDS`

`DATABASE_URL` should target pooled/runtime Postgres credentials. `DATABASE_MIGRATION_URL` should target direct or migration-safe credentials for Drizzle tooling.

## Docs

Unified deploy guide lives at [docs/deploy-railway-vercel.md](/C:/Users/ymath/OneDrive/Documentos/Projects/marginflow/docs/deploy-railway-vercel.md).

It covers:

- Railway setup for API
- Vercel setup for web
- required and optional env vars
- deploy order
- post-deploy validation
- troubleshooting
