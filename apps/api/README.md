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
- Authenticated `POST /billing/checkout/confirm` to mirror the subscription after Checkout redirect (covers delayed or missing webhooks during local dev)
- Live Stripe reconcile on `GET /billing/subscription` and every `EntitlementGuard` gate when Postgres shows `active`/`trialing` for a Stripe-linked row, so cancelling in Stripe revokes access even if webhook delivery stalled
- Stripe webhook handling at `POST /billing/stripe/webhook`
- marketplace connection module with `GET /integrations`, `POST /integrations/mercadolivre/connect`, `GET /integrations/mercadolivre/callback`, and `POST /integrations/:provider/disconnect`
- entitlement enforcement for protected API surfaces (including `/products` and `/costs/*`)
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
- `corepack pnpm ngrok:mercadolivre:callback`
- `corepack pnpm ngrok:mercadolivre:callback:url`

## Render baseline

- Build command: `corepack pnpm install && corepack pnpm --filter @marginflow/api build`
- Start command: `corepack pnpm --filter @marginflow/api start`
- Health check path: `/health`

## Environment

The dev server loads `.env`, `.env.local`, and (when `NODE_ENV` is `development`) `.env.development` from the **monorepo root**, not from `apps/api`. Copy `.env.example` there or set variables in your shell.

- `API_HOST`: listen host, default `0.0.0.0`
- `API_PORT`: listen port, default `4000`
- `API_DB_POOL_MAX`: Postgres pool size cap for API runtime, default `10`
- `NGROK_AUTHTOKEN`: optional local ngrok auth token used by the helper tunnel script
- `NGROK_DOMAIN`: optional reserved ngrok domain used by the helper tunnel script
- `DATABASE_URL`: Postgres connection string used by Drizzle for local development and Supabase production
- `BETTER_AUTH_SECRET`: Better Auth signing secret
- `BETTER_AUTH_URL`: absolute API base URL used by Better Auth callbacks and cookies
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `MERCADOLIVRE_CLIENT_ID`: optional Mercado Livre app ID used for the live marketplace connection flow
- `MERCADOLIVRE_CLIENT_SECRET`: optional Mercado Livre app secret used for token exchange
- `MERCADOLIVRE_REDIRECT_URI`: optional exact callback URI for Mercado Livre; defaults to `<BETTER_AUTH_URL>/integrations/mercadolivre/callback`
- `AUTH_TRUSTED_ORIGINS`: optional comma-separated extra trusted frontend origins
- `WEB_APP_ORIGIN`: allowed browser origin for credentialed requests, default `http://localhost:3000`
- `STRIPE_SECRET_KEY`: Stripe secret API key used for checkout and webhook follow-up fetches
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signing secret used to verify raw webhook payloads
- `STRIPE_PRICE_MONTHLY`: Stripe recurring price ID for the monthly plan
- `STRIPE_PRICE_ANNUAL`: Stripe recurring price ID for the annual plan
- `SYNC_RELAX_GUARDS`: when `true` / `1` / `yes`, skips overnight and “window already used” sync availability checks for local testing; **ignored when `NODE_ENV` is `production`**

`DATABASE_URL` now matters for runtime boot. For local development, point it at plain Postgres. For production, point it at Supabase Postgres. `SUPABASE_*` values remain reserved for later service integrations.

## Ngrok for Mercado Livre local callbacks

Keep the default local app flow unchanged:

- `BETTER_AUTH_URL=http://localhost:4000`
- `WEB_APP_ORIGIN=http://localhost:3000`
- web app still runs on `http://localhost:3000`
- API still runs on `http://localhost:4000`

Use ngrok only to give Mercado Livre a stable public callback URL for the local API.

Recommended root `.env` additions:

- `NGROK_AUTHTOKEN=...`
- `NGROK_DOMAIN=your-reserved-domain.ngrok.app`
- `MERCADOLIVRE_REDIRECT_URI=https://your-reserved-domain.ngrok.app/integrations/mercadolivre/callback`

Workflow:

1. Start the API locally with `corepack pnpm dev:api`
2. Start the tunnel with `corepack pnpm ngrok:mercadolivre:callback`
3. Print the exact callback URL with `corepack pnpm ngrok:mercadolivre:callback:url`
4. Register that exact URL in the Mercado Livre developer portal
5. Run the existing connection flow from `/app/integrations`

The ngrok helper assumes the ngrok agent is already installed locally and available on your `PATH`.
