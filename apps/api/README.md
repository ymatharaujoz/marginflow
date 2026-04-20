# API App

NestJS backend scaffold for MarginFlow. M3 establishes:

- Fastify adapter
- `GET /health` health endpoint
- explicit CORS strategy for web-to-api requests
- shared exception handling and future Zod validation seam
- Render-ready start/build commands

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
- `WEB_APP_ORIGIN`: allowed browser origin for credentialed requests, default `http://localhost:3000`

Auth, billing, database, and integration secrets stay in `.env.example` for later milestones, but M3 runtime boot only requires the API host/origin settings above.
