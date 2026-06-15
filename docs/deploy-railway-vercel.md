# Deploy do MarginFlow: Web na Vercel, Auth/API no Railway

## Resumo

Arquitetura atual:

- `apps/web` deploy na Vercel
- `apps/api` deploy no Railway
- browser e SSR do web chamam API Railway direto
- Railway e dono de Better Auth + Google OAuth
- Vercel mantem apenas sessao SSR espelhada first-party

## Valores canonicos de producao

- Web `NEXT_PUBLIC_APP_URL=https://marginflow-web.vercel.app`
- Web `NEXT_PUBLIC_API_BASE_URL=https://marginflow-production.up.railway.app`
- Web `WEB_SESSION_SECRET=<segredo forte>`
- API `BETTER_AUTH_URL=https://marginflow-production.up.railway.app/auth`
- API `API_PUBLIC_BASE_URL=https://marginflow-production.up.railway.app`
- API `WEB_APP_ORIGIN=https://marginflow-web.vercel.app`
- API `AUTH_TRUSTED_ORIGINS=https://marginflow-web.vercel.app`

Google OAuth:

- Authorized redirect URI:
  - `https://marginflow-production.up.railway.app/auth/callback/google`

## Fluxo de auth

1. usuario abre `https://marginflow-web.vercel.app/sign-in`
2. web redireciona para `https://marginflow-production.up.railway.app/auth/start/google`
3. Google volta para `https://marginflow-production.up.railway.app/auth/callback/google`
4. Railway cria ticket one-time e redireciona para `https://marginflow-web.vercel.app/auth/complete?...`
5. web troca ticket por payload autenticado, cria sessao SSR local e segue para `/app`

## Variaveis obrigatorias

### Railway API

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `API_PUBLIC_BASE_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `WEB_APP_ORIGIN`
- `AUTH_TRUSTED_ORIGINS`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_MONTHLY`
- `STRIPE_PRICE_ANNUAL`
- `NODE_ENV=production`

Opcional:

- `BETTER_AUTH_API_KEY`
- `DATABASE_MIGRATION_URL`
- `API_DB_POOL_MAX`
- `MERCADOLIVRE_CLIENT_ID`
- `MERCADOLIVRE_CLIENT_SECRET`
- `MERCADOLIVRE_REDIRECT_URI`

### Vercel Web

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_API_BASE_URL`
- `WEB_SESSION_SECRET`

## Ordem de deploy

1. configurar envs do Railway
2. deploy API no Railway
3. configurar callback Google para Railway `/auth/callback/google`
4. configurar envs do Vercel
5. deploy web na Vercel
6. validar login completo

## Validacao manual

- abrir `/sign-in` na Vercel
- confirmar redirect para Railway `/auth/start/google`
- confirmar callback Google em Railway `/auth/callback/google`
- confirmar redirect final para Vercel `/auth/complete`
- confirmar `/app` autenticado no SSR
- confirmar logout limpa sessao local do web

## Troubleshooting

### Login falha logo no inicio

Verificar:

- `NEXT_PUBLIC_API_BASE_URL` aponta para Railway
- `BETTER_AUTH_URL` aponta para Railway `/auth`
- `WEB_APP_ORIGIN` bate com dominio Vercel
- Google callback URI bate exatamente com Railway `/auth/callback/google`

### `/auth/complete` falha

Verificar:

- API publicou endpoint `POST /auth-state/exchange-ticket`
- ticket one-time nao expirou
- `WEB_SESSION_SECRET` existe no projeto web

### SSR autenticado nao funciona

Verificar:

- cookie local `marginflow.web_session` esta sendo criado
- payload trocado inclui `remoteSessionToken`
- chamadas SSR do web para Railway enviam `better-auth.session_token`
