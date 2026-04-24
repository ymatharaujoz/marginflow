# API App

NestJS backend scaffold for MarginFlow. M5 and M6 currently include:

- Fastify adapter
- `GET /health` health endpoint
- explicit credentialed CORS strategy for web-to-api requests
- Better Auth mounted under `/auth/*`
- session-aware `GET /auth-state/me` and protected guard seam
- default-organization bootstrap for first authenticated access
- Stripe-backed billing module with `GET /billing/subscription`
- API-owned Stripe checkout creation through `POST /billing/checkout`
- Stripe webhook handling at `POST /billing/stripe/webhook`
- entitlement enforcement for protected API surfaces
- shared trusted-origin parsing for Fastify CORS and Better Auth
- lifecycle-managed Postgres runtime that keeps the `DATABASE_CLIENT` token stable for modules
- shared exception handling and future Zod validation seam
- Render-ready start/build commands
- shared database provider seam for app modules

## Local commands

- `corepack pnpm --filter @marginflow/api dev`
- `corepack pnpm --filter @marginflow/api build`
- `corepack pnpm --filter @marginflow/api start`
- `corepack pnpm --filter @marginflow/api test`

## Render baseline

- Build command: `corepack pnpm install && corepack pnpm --filter @marginflow/api build`
- Start command: `corepack pnpm --filter @marginflow/api start`
- Health check path: `/health`

## Environment

- `API_HOST`: listen host, default `0.0.0.0`
- `API_PORT`: listen port, default `4000`
- `API_DB_POOL_MAX`: Postgres pool size cap for API runtime, default `10`
- `DATABASE_URL`: Postgres connection string used by Drizzle for local development and Supabase production
- `BETTER_AUTH_SECRET`: Better Auth signing secret
- `BETTER_AUTH_URL`: absolute API base URL used by Better Auth callbacks and cookies
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `AUTH_TRUSTED_ORIGINS`: optional comma-separated extra trusted frontend origins
- `WEB_APP_ORIGIN`: allowed browser origin for credentialed requests, default `http://localhost:3000`
- `STRIPE_SECRET_KEY`: Stripe secret API key used for checkout and webhook follow-up fetches
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signing secret used to verify raw webhook payloads
- `STRIPE_PRICE_MONTHLY`: Stripe recurring price ID for the monthly plan
- `STRIPE_PRICE_ANNUAL`: Stripe recurring price ID for the annual plan

`DATABASE_URL` now matters for runtime boot. For local development, point it at plain Postgres. For production, point it at Supabase Postgres. `SUPABASE_*` values remain reserved for later service integrations.
