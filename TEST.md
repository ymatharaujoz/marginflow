# TESTE LOCAL DO MARGINFLOW

Este guia descreve como subir o projeto localmente e como validar o estado atual do MarginFlow para auth, billing e protecao de rotas.

O foco aqui e o fluxo real que existe hoje no repositorio:

- `apps/web` em `http://localhost:3000`
- `apps/api` em `http://localhost:4000`
- Better Auth com Google
- Stripe Checkout + webhook
- conexoes de marketplace com Mercado Livre
- acesso ao `/app` protegido por sessao e entitlement

## 1. Pre-requisitos

Antes de comecar, confirme que voce tem:

- Node.js 24 ou superior
- Corepack habilitado
- pnpm via Corepack
- Postgres local rodando e acessivel pelo `DATABASE_URL`
- credenciais Google OAuth validas
- conta Stripe em modo de teste
- Stripe CLI instalada para encaminhar webhooks localmente

### Servicos locais esperados

- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- Banco: definido em `DATABASE_URL`

## 2. Variaveis de ambiente importantes

Use `.env.example` como base e preencha um arquivo `.env`.

### URLs e runtime

- `NEXT_PUBLIC_APP_URL`: URL publica do frontend local. Ex.: `http://localhost:3000`
- `NEXT_PUBLIC_API_BASE_URL`: URL base da API consumida pelo web. Ex.: `http://localhost:4000`
- `WEB_APP_ORIGIN`: origem do frontend permitida pela API. Ex.: `http://localhost:3000`
- `API_HOST`: host da API. Ex.: `0.0.0.0`
- `API_PORT`: porta da API. Ex.: `4000`
- `API_DB_POOL_MAX`: limite do pool Postgres da API. Ex.: `10`

### Banco

- `DATABASE_URL`: string de conexao Postgres usada no runtime e nas migracoes

### Better Auth / Google

- `BETTER_AUTH_SECRET`: secret do Better Auth
- `BETTER_AUTH_URL`: base URL da API usada pelo Better Auth. Ex.: `http://localhost:4000`
- `GOOGLE_CLIENT_ID`: client ID do Google OAuth
- `GOOGLE_CLIENT_SECRET`: client secret do Google OAuth
- `AUTH_TRUSTED_ORIGINS`: origens extras confiaveis separadas por virgula. Em local, normalmente `http://localhost:3000`

### Stripe

- `STRIPE_SECRET_KEY`: chave secreta Stripe em modo de teste
- `STRIPE_WEBHOOK_SECRET`: secret gerado pelo `stripe listen`
- `STRIPE_PRICE_MONTHLY`: price ID mensal em modo de teste
- `STRIPE_PRICE_ANNUAL`: price ID anual em modo de teste

### Marketplace / Mercado Livre

- `MERCADOLIVRE_CLIENT_ID`: app ID do Mercado Livre
- `MERCADOLIVRE_CLIENT_SECRET`: secret do app Mercado Livre
- `MERCADOLIVRE_REDIRECT_URI`: opcional; se nao for definido, o backend usa `http://localhost:4000/integrations/mercadolivre/callback`

### Supabase

As variaveis abaixo nao sao necessarias para o fluxo local atual de teste de auth e billing:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Hoje o repositorio usa `DATABASE_URL` como fonte principal de conexao com o Postgres.

## 3. Configuracao inicial

### 3.1 Instalar dependencias

```powershell
corepack enable
corepack pnpm install
```

### 3.2 Configurar ambiente

1. Copie `.env.example` para `.env`.
2. Preencha as variaveis obrigatorias.
3. Garanta que o Postgres local aceite a conexao usada em `DATABASE_URL`.

### 3.3 Preparar banco

```powershell
corepack pnpm db:migrate
```

Se quiser popular fixtures locais depois, voce tambem pode usar:

```powershell
corepack pnpm db:seed
```

## 4. Como rodar o projeto

Abra dois terminais.

### Terminal 1: API

```powershell
corepack pnpm dev:api
```

Valide:

- `http://localhost:4000/health` deve responder com sucesso

### Terminal 2: Web

```powershell
corepack pnpm dev:web
```

Valide:

- `http://localhost:3000` deve abrir o site

Observacao: o comando `corepack pnpm dev` tambem existe, mas para testes locais fica mais claro subir `web` e `api` separadamente.

## 5. Checagens automatizadas antes do teste manual

Antes de abrir o fluxo no navegador, rode:

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
```

Opcionalmente, rode tambem:

```powershell
corepack pnpm build
```

Esses comandos ajudam a separar erro estrutural de erro de configuracao local.

## 6. Configuracao local do Google OAuth

Para o login Google funcionar localmente, confira a configuracao do app OAuth no Google Cloud:

- Authorized JavaScript origins:
  - `http://localhost:3000`
  - `http://localhost:4000` se voce quiser manter a origem da API explicitamente permitida
- Authorized redirect URI:
  - `http://localhost:4000/auth/callback/google`

Isso deve bater com:

- `BETTER_AUTH_URL=http://localhost:4000`
- `basePath="/auth"` na configuracao atual do Better Auth

## 7.1 Configuracao local do Mercado Livre

Para a conexao do Mercado Livre funcionar localmente, confira a configuracao do app no portal de developers:

- Redirect URI cadastrada:
  - `http://localhost:4000/integrations/mercadolivre/callback`

Isso deve bater com:

- `MERCADOLIVRE_REDIRECT_URI=http://localhost:4000/integrations/mercadolivre/callback` se voce optar por explicitar a variavel
- ou o fallback automatico baseado em `BETTER_AUTH_URL=http://localhost:4000`

## 7. Passo a passo para testar Better Auth e autenticacao

### 7.1 Confirmar comportamento sem sessao

1. Abra `http://localhost:3000/app` em uma janela anonima.
2. Resultado esperado: redirecionamento para `http://localhost:3000/sign-in`.

### 7.2 Iniciar login Google

1. Abra `http://localhost:3000/sign-in`.
2. Clique em `Continue with Google`.
3. Resultado esperado: o navegador inicia o redirecionamento para o Google.

### 7.3 Completar autenticacao

1. Finalize o login com uma conta de teste.
2. Resultado esperado:
   - a sessao Better Auth e criada
   - o primeiro acesso cria a organizacao padrao automaticamente
   - voce volta para o fluxo do app

### 7.4 Validar sessao no backend

Com a sessao ativa no navegador, abra uma chamada autenticada para:

- `GET http://localhost:4000/auth-state/me`

Resultado esperado:

- status `200`
- payload com `session`, `user` e `organization`

Sem sessao:

- status `401`

### 7.5 Validar sign out

1. Dentro do app, clique em `Sign out`.
2. Tente abrir `http://localhost:3000/app` novamente.
3. Resultado esperado: volta para `/sign-in`.

## 8. Passo a passo para testar Stripe e billing

O estado atual do projeto exige sessao autenticada, mas tambem exige subscription ativa para liberar `/app`.

### 8.1 Preparar Stripe CLI

Em um terceiro terminal, rode:

```powershell
stripe listen --forward-to http://localhost:4000/billing/stripe/webhook
```

Copie o valor `whsec_...` exibido pela Stripe CLI e atualize:

- `STRIPE_WEBHOOK_SECRET`

Reinicie a API depois de alterar o `.env`.

### 8.2 Confirmar configuracao Stripe

Antes do checkout, confirme:

- `STRIPE_SECRET_KEY` aponta para modo de teste
- `STRIPE_PRICE_MONTHLY` existe no Stripe e e recorrente
- `STRIPE_PRICE_ANNUAL` existe no Stripe e e recorrente

### 8.3 Validar paywall para usuario autenticado sem entitlement

1. Faca login.
2. Abra `http://localhost:3000/app`.
3. Resultado esperado:
   - usuario autenticado sem assinatura ativa nao entra em `/app`
   - o web redireciona para `http://localhost:3000/app/billing`

### 8.4 Iniciar checkout

Na tela `/app/billing`:

1. Clique em `Choose Monthly plan` ou `Choose Annual plan`.
2. Resultado esperado:
   - o frontend chama `POST /billing/checkout`
   - o navegador redireciona para a URL retornada pelo Stripe Checkout

### 8.5 Completar checkout em modo de teste

1. Finalize o checkout usando um cartao de teste do Stripe.
2. Resultado esperado:
   - voce retorna para `/app/billing?checkout=success...`
   - a Stripe CLI mostra entrega do webhook para `POST /billing/stripe/webhook`

### 8.6 Confirmar espelhamento local da subscription

Com a mesma sessao ativa, consulte:

- `GET http://localhost:4000/billing/subscription`

Resultado esperado:

- status `200`
- `entitled: true`

## 9. Passo a passo para testar conexoes de marketplace

O estado atual do projeto ja entrega a superficie `/app/integrations`, mas a conclusao honesta do M10 ainda depende da validacao manual com credenciais reais do Mercado Livre.

### 9.1 Abrir a area autenticada de integracoes

1. Faca login.
2. Garanta que a organizacao esteja com `entitled: true`.
3. Abra `http://localhost:3000/app/integrations`.
4. Resultado esperado:
   - a pagina carrega cards para `Mercado Livre` e `Shopee`
   - `Mercado Livre` aparece como conectavel quando `MERCADOLIVRE_CLIENT_ID` e `MERCADOLIVRE_CLIENT_SECRET` existem
   - `Shopee` aparece como indisponivel, mas ja ocupando a mesma fronteira de provider

### 9.2 Iniciar a conexao do Mercado Livre

1. Clique em `Connect account` no card do Mercado Livre.
2. Resultado esperado:
   - o frontend chama `POST /integrations/mercadolivre/connect`
   - o backend retorna a URL de autorizacao
   - o navegador redireciona para `https://auth.mercadolivre.com.br/authorization`

### 9.3 Completar o callback

1. Autorize o app no Mercado Livre.
2. Resultado esperado:
   - o provider redireciona para `GET /integrations/mercadolivre/callback`
   - o backend troca o `code` em `https://api.mercadolibre.com/oauth/token`
   - o backend consulta `GET https://api.mercadolibre.com/users/me`
   - a conexao e persistida em `marketplace_connections`
   - voce volta para `http://localhost:3000/app/integrations?provider=mercadolivre&status=success...`

### 9.4 Confirmar o estado local da conexao

Com a mesma sessao ativa, consulte:

- `GET http://localhost:4000/integrations`

Resultado esperado:

- status `200`
- card `mercadolivre` com `status: connected`
- `connectedAccountId` preenchido
- `connectedAccountLabel` preenchido quando o provider devolver `nickname` ou `email`

### 9.5 Validar desconexao local

1. Na tela `/app/integrations`, clique em `Disconnect`.
2. Resultado esperado:
   - o frontend chama `POST /integrations/mercadolivre/disconnect`
   - tokens locais sao limpos
   - o card volta para `status: disconnected`
- `subscription.status: "active"` apos o webhook ser processado

Se o webhook ainda nao chegou, o painel pode continuar mostrando o acesso como inativo por alguns instantes.

### 8.7 Validar liberacao do app

1. Atualize `http://localhost:3000/app`.
2. Resultado esperado: a pagina protegida abre normalmente.

## 9. Passo a passo para testar protecao de rotas

### 9.1 Rota web protegida sem sessao

- Acesse `/app` sem login
- Esperado: redireciona para `/sign-in`

### 9.2 Rota web protegida com sessao, mas sem assinatura ativa

- Acesse `/app` autenticado, mas sem subscription ativa
- Esperado: redireciona para `/app/billing`

### 9.3 Rota web protegida com sessao e assinatura ativa

- Acesse `/app` autenticado e com subscription ativa
- Esperado: renderiza a tela protegida

### 9.4 Rota de API protegida por entitlement

Teste:

- `GET http://localhost:4000/auth-state/protected`

Resultados esperados:

- sem sessao: `401`
- com sessao, mas sem entitlement ativo: `402`
- com sessao e entitlement ativo: `200`

Essa rota e um bom exemplo para validar protecao no backend sem depender da UI.

## 10. Endpoints uteis durante o teste

### Auth

- `GET /auth-state/me`
- `GET /auth-state/protected`

### Billing

- `GET /billing/subscription`
- `POST /billing/checkout`
- `POST /billing/stripe/webhook`

### Infra

- `GET /health`

## 11. Problemas comuns

### `DATABASE_URL` invalido ou Postgres fora do ar

Sintomas:

- API nao sobe
- migracoes falham
- runtime nao conecta no banco

Revise:

- host, porta, usuario, senha e database

### `BETTER_AUTH_URL` incorreto

Sintomas:

- callback Google falha
- URL de auth aponta para destino errado

Valor esperado em local:

- `http://localhost:4000`

### `WEB_APP_ORIGIN` ou `AUTH_TRUSTED_ORIGINS` incorretos

Sintomas:

- cookies nao funcionam corretamente
- falha em requests cross-origin com credenciais
- sign-in/sign-out inconsistentes

Valor local esperado:

- `WEB_APP_ORIGIN=http://localhost:3000`
- `AUTH_TRUSTED_ORIGINS=http://localhost:3000`

### Callback Google nao configurado

Sintomas:

- erro de redirect URI mismatch no Google

Confira:

- `http://localhost:4000/auth/callback/google`

### `STRIPE_WEBHOOK_SECRET` incorreto

Sintomas:

- checkout conclui, mas a subscription local nao muda
- webhook retorna erro de assinatura

Solucao:

- rode novamente `stripe listen --forward-to http://localhost:4000/billing/stripe/webhook`
- copie o novo `whsec_...`
- atualize o `.env`
- reinicie a API

### Price IDs Stripe nao conferem com o ambiente

Sintomas:

- checkout falha ao abrir
- plano errado e usado
- subscription nao bate com o intervalo esperado

Confira:

- `STRIPE_PRICE_MONTHLY`
- `STRIPE_PRICE_ANNUAL`

Ambos devem existir em modo de teste e ser recorrentes.

## 12. Resumo rapido do fluxo esperado

1. Subir Postgres, API e Web.
2. Rodar `lint`, `typecheck` e `test`.
3. Acessar `/app` sem login e confirmar redirecionamento para `/sign-in`.
4. Fazer login com Google.
5. Confirmar que sem assinatura ativa o app manda para `/app/billing`.
6. Subir `stripe listen`, ajustar `STRIPE_WEBHOOK_SECRET` e reiniciar a API.
7. Abrir checkout Stripe e concluir o pagamento de teste.
8. Confirmar `GET /billing/subscription` com `entitled: true`.
9. Confirmar que `/app` passa a abrir normalmente.
