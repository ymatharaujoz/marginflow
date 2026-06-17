# API App

NestJS + Fastify backend for Lucreii.

## Local commands

- `corepack pnpm --filter @lucreii/api dev`
- `corepack pnpm --filter @lucreii/api build`
- `corepack pnpm --filter @lucreii/api start`
- `corepack pnpm --filter @lucreii/api test`
- `corepack pnpm ngrok:mercadolivre:callback`
- `corepack pnpm ngrok:mercadolivre:callback:url`

## Local environment loading

Local runtime reads `.env`, `.env.local`, and development overrides from `apps/api`.
`apps/api/.env.example` is the deploy template/reference for Railway.

## Railway deploy baseline

This app is deployed as its own Railway service while still using the monorepo root for install/build.

- Config file: `/apps/api/railway.toml`
- Build command: `corepack enable && corepack pnpm install --frozen-lockfile && corepack pnpm --filter @lucreii/api build`
- Start command: `corepack pnpm --filter @lucreii/api start`
- Health check path: `/health`

Important:

- Keep repository root available during build because API depends on workspace packages.
- Railway injects `PORT`; `readApiEnv()` already falls back from `API_PORT` to `PORT`.
- Current production runtime intentionally stays on `tsx src/main.ts`; this cycle does not switch to `dist`.

## Runtime environment

All API envs live in `apps/api/.env` locally and are configured directly in Railway in production.
`NEXT_PUBLIC_*` variables belong to `apps/web` and are **not** read by the API.

Required in production:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `API_PUBLIC_BASE_URL`
- `WEB_APP_ORIGIN`
- `AUTH_TRUSTED_ORIGINS`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_START_MONTHLY`
- `STRIPE_PRICE_START_ANNUAL`
- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_PRICE_PRO_ANNUAL`
- `STRIPE_PRICE_BUSINESS_MONTHLY`
- `STRIPE_PRICE_BUSINESS_ANNUAL`
- `NODE_ENV=production`

Optional but recommended:

- `DATABASE_MIGRATION_URL`
- `API_DB_POOL_MAX`
- `BETTER_AUTH_API_KEY` (required if you want Better Auth Dashboard / ownership verification)

Optional marketplace integrations:

- `MERCADOLIVRE_CLIENT_ID`
- `MERCADOLIVRE_CLIENT_SECRET`
- `MERCADOLIVRE_REDIRECT_URI`
- `MERCADOLIVRE_USE_PKCE`
- `SHOPEE_PARTNER_ID`
- `SHOPEE_PARTNER_KEY`
- `SHOPEE_REDIRECT_URI`
- `SHOPEE_WEBHOOK_URL`

Optional local/testing helper:

- `SYNC_RELAX_GUARDS` (ignored when `NODE_ENV=production`)

`DATABASE_URL` should target pooled/runtime Postgres credentials. `DATABASE_MIGRATION_URL` should target direct or migration-safe credentials for Drizzle tooling.
`BETTER_AUTH_URL` should point at the direct public Better Auth surface on Railway, such as `https://marginflow-production.up.railway.app/auth`. `API_PUBLIC_BASE_URL` should remain the raw public backend base, such as the same Railway URL without `/auth`.
For the current production setup, `WEB_APP_ORIGIN` and `AUTH_TRUSTED_ORIGINS` should match `https://www.lucreii.com.br`.

## Mercado Livre local flow

Recommended local setup for OAuth verification:

- `WEB_APP_ORIGIN=http://localhost:3000`
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000`
- `BETTER_AUTH_URL=http://localhost:4000/auth`
- `API_PUBLIC_BASE_URL=http://localhost:4000` when you want strict local parity
- `MERCADOLIVRE_REDIRECT_URI=https://<your-ngrok-domain>/integrations/mercadolivre/callback`

Notes:

- the ngrok domain must forward to the local API on port `4000`
- configure OAuth callback in Mercado Livre as `https://<your-ngrok-domain>/integrations/mercadolivre/callback`
- configure Mercado Livre sales notifications webhook as `https://<your-ngrok-domain>/integrations/mercadolivre/webhook`
- the API also accepts `https://<your-ngrok-domain>/integrations/mercadolivre/notifications` as a compatibility alias for webhook notifications
- if the Mercado Livre app has PKCE enabled, set `MERCADOLIVRE_USE_PKCE=true`
- startup now warns when the callback host differs from the effective public API host so local tunnel mismatches are easier to spot

## Docs

Unified deploy guide lives at [docs/deploy-railway-vercel.md](/C:/Users/ymath/OneDrive/Documentos/Projects/lucreii/docs/deploy-railway-vercel.md).

It covers:

- Railway setup for API
- Vercel setup for web
- required and optional env vars
- deploy order
- post-deploy validation
- troubleshooting
### Shopee Open Platform

Configure estas variáveis no serviço da API no Railway:

```env
SHOPEE_PARTNER_ID=123456
SHOPEE_PARTNER_KEY=secret
SHOPEE_REDIRECT_URI=https://api.example.com/integrations/shopee/callback
SHOPEE_WEBHOOK_URL=https://api.example.com/integrations/shopee/webhook
```

Cadastre exatamente as mesmas URLs no app Shopee Open Platform. Habilite pelo menos
`order_status_push` e as permissões de Order e Payment/Escrow. A V1 usa push automático
e sincronização manual; não requer Cron, worker ou Redis.
