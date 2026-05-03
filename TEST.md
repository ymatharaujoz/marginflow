# TESTE LOCAL DO MARGINFLOW

Este arquivo e o runbook oficial para configurar, subir e validar o MarginFlow localmente.

Ele foi escrito para o estado atual do repositorio:

- `apps/web` em `http://localhost:3000`
- `apps/api` em `http://localhost:4000`
- Postgres via `DATABASE_URL`
- Better Auth com Google
- Stripe Checkout + webhook
- integracoes em `/app/integrations`
- sync manual e dashboard ja implementados

Use este guia quando voce precisar:

- preparar o ambiente local
- entender quais envs sao obrigatorias e por que elas importam
- rodar web, api e banco sem adivinhar
- validar auth, billing, integracoes, sync e dashboard
- destravar os blockers reais dos milestones ainda abertos

## 1. Visao geral rapida

Hoje o fluxo principal do produto e este:

1. o usuario acessa o site publico no web
2. entra pelo Google em `/sign-in`
3. tenta abrir `/app`
4. se nao tiver sessao, volta para `/sign-in`
5. se tiver sessao, mas nao tiver entitlement, vai para `/app/billing`
6. se tiver sessao e entitlement, entra no dashboard em `/app`
7. com entitlement ativo, pode abrir `/app/integrations`, conectar Mercado Livre, rodar sync e depois ver o resultado no dashboard

## 2. Pre-requisitos locais

Antes de comecar, confirme que voce tem:

- Node.js `24` ou superior
- Corepack habilitado
- pnpm via Corepack
- Postgres local acessivel pelo `DATABASE_URL`
- credenciais validas de Google OAuth
- conta Stripe em modo de teste
- Stripe CLI instalada
- ngrok instalada com um dominio reservado estavel, se voce for validar o callback real do Mercado Livre
- opcionalmente credenciais reais de Mercado Livre para validar M10 e M11

Servicos locais esperados:

- web: `http://localhost:3000`
- api: `http://localhost:4000`
- banco: definido em `DATABASE_URL`

## 3. Estrategia de env

Arquivos principais:

- `.env.example`: modelo base do projeto
- `.env`: arquivo recomendado para desenvolvimento local
- `apps/web/.env.local`: opcional, apenas se voce quiser override especifico do frontend

Estrutura recomendada:

1. copie `.env.example` para `.env`
2. preencha os valores reais
3. reinicie `dev:web` e `dev:api` sempre que alterar envs sensiveis

Observacao importante:

- o frontend le `NEXT_PUBLIC_APP_URL` e `NEXT_PUBLIC_API_BASE_URL` para montar o ambiente publico
- se essas duas envs estiverem ausentes, `/sign-in` pode falhar antes mesmo do auth iniciar

## 4. Variaveis de ambiente e por que elas importam

### 4.1 Frontend publico

#### `NEXT_PUBLIC_APP_URL`

- Onde e usada: frontend web
- Valor local esperado: `http://localhost:3000`
- Obrigatoria para: boot do web e fluxos publicos/protegidos
- O que quebra se faltar: o frontend nao consegue validar o ambiente publico; `/sign-in` pode falhar antes do Better Auth iniciar

#### `NEXT_PUBLIC_API_BASE_URL`

- Onde e usada: frontend web para falar com a API
- Valor local esperado: `http://localhost:4000`
- Obrigatoria para: boot do web, auth, billing, integracoes, dashboard
- O que quebra se faltar: chamadas para a API ficam sem base URL; `/sign-in` tambem pode falhar cedo por validacao de env

### 4.2 API e runtime

#### `API_HOST`

- Onde e usada: bootstrap da API
- Valor local esperado: `0.0.0.0`
- Obrigatoria para: boot da API
- O que quebra se estiver errada: a API pode subir em interface errada ou nao ficar acessivel como esperado

#### `API_PORT`

- Onde e usada: bootstrap da API
- Valor local esperado: `4000`
- Obrigatoria para: boot da API
- O que quebra se estiver errada: comandos, callbacks e chamadas do frontend podem apontar para a porta incorreta

#### `WEB_APP_ORIGIN`

- Onde e usada: CORS, cookies e trusted origin padrao da API
- Valor local esperado: `http://localhost:3000`
- Obrigatoria para: auth e requests com credenciais
- O que quebra se estiver errada: sessao instavel, falha em cookies cross-origin e problemas em login/logout

#### `API_DB_POOL_MAX`

- Onde e usada: runtime de conexao com Postgres
- Valor local esperado: `10`
- Obrigatoria para: boot estavel da API
- O que quebra se estiver errada: o pool pode ficar apertado demais ou excessivo demais; nao costuma quebrar o fluxo sozinho, mas afeta estabilidade

#### `NGROK_AUTHTOKEN`

- Onde e usada: helper local do tunnel ngrok
- Obrigatoria para: abrir o tunnel autenticado com a sua conta ngrok
- O que quebra se faltar: o script de tunnel depende do agente instalado e pode nao conseguir usar o dominio reservado da sua conta

#### `NGROK_DOMAIN`

- Onde e usada: helper local do tunnel ngrok e callback publico estavel do Mercado Livre
- Valor local esperado: algo como `meu-api.ngrok.app`
- Obrigatoria para: callback estavel do Mercado Livre no ambiente local
- O que quebra se faltar: voce continua com localhost para o resto do app, mas nao tem um callback publico fixo para o Mercado Livre

### 4.3 Banco

#### `DATABASE_URL`

- Onde e usada: runtime, migracoes e seed
- Valor local esperado: algo como `postgresql://postgres:root@localhost:5432/marginflow`
- Obrigatoria para: API, `db:migrate` e `db:seed`
- O que quebra se faltar: API nao sobe, migracoes falham, sync/dashboard nao conseguem persistir nem ler dados

### 4.4 Better Auth e Google

#### `BETTER_AUTH_SECRET`

- Onde e usada: Better Auth no backend
- Obrigatoria para: sessao e seguranca do auth
- O que quebra se faltar: auth nao inicializa corretamente

#### `BETTER_AUTH_URL`

- Onde e usada: backend auth e callbacks
- Valor local esperado: `http://localhost:4000`
- Obrigatoria para: login Google e callbacks
- O que quebra se estiver errada: redirect/callback aponta para destino errado

#### `GOOGLE_CLIENT_ID`

- Onde e usada: provider Google do Better Auth
- Obrigatoria para: login Google
- O que quebra se faltar: botao de login nao consegue iniciar o fluxo real

#### `GOOGLE_CLIENT_SECRET`

- Onde e usada: provider Google do Better Auth
- Obrigatoria para: login Google
- O que quebra se faltar: callback/token exchange do Google falha

#### `AUTH_TRUSTED_ORIGINS`

- Onde e usada: trusted origins extras na API
- Valor local esperado: `http://localhost:3000`
- Obrigatoria para: auth com cookies e navegacao entre web e api
- O que quebra se estiver errada: sessao inconsistente, falha em requests autenticadas, problemas em sign-in/sign-out

### 4.5 Stripe

#### `STRIPE_SECRET_KEY`

- Onde e usada: backend de billing
- Obrigatoria para: criar checkout e consultar Stripe
- O que quebra se faltar: `POST /billing/checkout` falha

#### `STRIPE_WEBHOOK_SECRET`

- Onde e usada: validacao de assinatura do webhook
- Obrigatoria para: espelhamento local da subscription
- O que quebra se estiver errada: o checkout pode concluir, mas o backend rejeita o webhook e o entitlement nao atualiza

#### `STRIPE_PRICE_MONTHLY`

- Onde e usada: criacao de checkout mensal
- Obrigatoria para: plano mensal
- O que quebra se estiver errada: checkout mensal falha ou aponta para price errado

#### `STRIPE_PRICE_ANNUAL`

- Onde e usada: criacao de checkout anual
- Obrigatoria para: plano anual
- O que quebra se estiver errada: checkout anual falha ou aponta para price errado

### 4.6 Mercado Livre

#### `MERCADOLIVRE_CLIENT_ID`

- Onde e usada: integracao Mercado Livre
- Obrigatoria para: iniciar conexao real do provider
- O que quebra se faltar: `/app/integrations` nao consegue abrir o fluxo real de conexao

#### `MERCADOLIVRE_CLIENT_SECRET`

- Onde e usada: token exchange do provider
- Obrigatoria para: callback e persistencia da conexao
- O que quebra se faltar: callback nao consegue trocar o `code` por token

#### `MERCADOLIVRE_REDIRECT_URI`

- Onde e usada: callback do provider
- Valor local esperado com ngrok: `https://<NGROK_DOMAIN>/integrations/mercadolivre/callback`
- Obrigatoria para: fluxo OAuth estavel
- O que quebra se estiver errada: redirect URI mismatch ou retorno para callback errada

Observacao:

- se `MERCADOLIVRE_REDIRECT_URI` nao for definida, o backend usa o callback local padrao esperado
- para a validacao real do Mercado Livre em desenvolvimento, prefira definir explicitamente a URL publica estavel do ngrok

### 4.7 Supabase

#### `SUPABASE_URL`

#### `SUPABASE_ANON_KEY`

#### `SUPABASE_SERVICE_ROLE_KEY`

- Onde sao usadas: reservadas para cenarios futuros ou integracoes adicionais
- Obrigatorias para o fluxo local atual: nao
- O que importa hoje: o ambiente local atual depende de `DATABASE_URL`, nao dessas envs

## 5. Setup inicial passo a passo

### 5.1 Instalar dependencias

```powershell
corepack enable
corepack pnpm install
```

### 5.2 Configurar o `.env`

1. copie `.env.example` para `.env`
2. preencha os valores obrigatorios
3. confirme principalmente:
  - `NEXT_PUBLIC_APP_URL=http://localhost:3000`
  - `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000`
  - `BETTER_AUTH_URL=http://localhost:4000`
  - `WEB_APP_ORIGIN=http://localhost:3000`
  - `AUTH_TRUSTED_ORIGINS=http://localhost:3000`
  - `DATABASE_URL=...`
  - `NGROK_DOMAIN=...` se voce for validar o callback do Mercado Livre
  - `MERCADOLIVRE_REDIRECT_URI=https://<NGROK_DOMAIN>/integrations/mercadolivre/callback` para o fluxo real do Mercado Livre

### 5.3 Rodar migracoes

```powershell
corepack pnpm db:migrate
```

Opcionalmente, para popular dados de desenvolvimento:

```powershell
corepack pnpm db:seed
```

## 6. Como subir o projeto

Abra dois terminais.

### Terminal 1: API

```powershell
corepack pnpm dev:api
```

Validacao esperada:

- `http://localhost:4000/health` responde com sucesso

### Terminal 2: Web

```powershell
corepack pnpm dev:web
```

Validacao esperada:

- `http://localhost:3000` abre o site publico

Observacao:

- `corepack pnpm dev` tambem existe, mas para diagnostico local e melhor subir `web` e `api` separados

### 6.1 Tunnel ngrok para callback do Mercado Livre

Se o objetivo for validar o callback real do Mercado Livre em desenvolvimento local, abra um terceiro terminal:

```powershell
corepack pnpm ngrok:mercadolivre:callback
```

Se quiser apenas imprimir a URL exata que deve ser cadastrada no portal do provider:

```powershell
corepack pnpm ngrok:mercadolivre:callback:url
```

Resultado esperado:

- o tunnel aponta para a API local na porta `4000`
- a callback publica fica em `https://<NGROK_DOMAIN>/integrations/mercadolivre/callback`
- o restante do fluxo continua local:
  - web em `http://localhost:3000`
  - API em `http://localhost:4000`
  - `BETTER_AUTH_URL=http://localhost:4000`
  - `WEB_APP_ORIGIN=http://localhost:3000`

## 7. Checks automatizados antes do navegador

Rode na raiz:

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
```

Opcional:

```powershell
corepack pnpm build
```

Objetivo desses checks:

- separar erro estrutural de erro de configuracao local
- confirmar que o repositorio esta integro antes de culpar env, OAuth ou webhook

## 8. Fluxo manual completo de validacao

Siga nesta ordem.

### 8.1 Testar homepage

1. abra `http://localhost:3000`
2. confirme que o site publico carrega normalmente

### 8.2 Testar acesso sem sessao

1. abra `http://localhost:3000/app` em janela anonima
2. esperado: redirecionamento para `http://localhost:3000/sign-in`

### 8.3 Testar login Google

Antes de clicar no botao, confira no Google Cloud:

- Authorized JavaScript origins:
  - `http://localhost:3000`
  - opcionalmente `http://localhost:4000`
- Authorized redirect URI:
  - `http://localhost:4000/auth/callback/google`

Agora teste:

1. abra `http://localhost:3000/sign-in`
2. clique em `Continue with Google`
3. conclua o login com uma conta de teste

Evidencia esperada:

- o navegador e redirecionado para o Google
- o callback volta corretamente
- a sessao e criada
- o primeiro acesso provisiona a organizacao padrao

### 8.4 Confirmar sessao no backend

Com a sessao ativa:

- `GET http://localhost:4000/auth-state/me`

Esperado:

- status `200`
- payload com `data.session`, `data.user` e `data.organization`

Sem sessao:

- status `401`

### 8.5 Testar paywall sem entitlement

1. depois do login, abra `http://localhost:3000/app`
2. esperado:
  - com sessao, mas sem assinatura ativa, o web redireciona para `http://localhost:3000/app/billing`

### 8.6 Configurar Stripe CLI

Em um terceiro terminal:

```powershell
stripe listen --forward-to http://localhost:4000/billing/stripe/webhook
```

Depois:

1. copie o `whsec_...` mostrado no terminal
2. atualize `STRIPE_WEBHOOK_SECRET` no `.env`
3. reinicie a API

### 8.7 Testar checkout Stripe

Antes de abrir checkout, confirme:

- `STRIPE_SECRET_KEY` esta em modo de teste
- `STRIPE_PRICE_MONTHLY` existe e e recorrente
- `STRIPE_PRICE_ANNUAL` existe e e recorrente

Agora teste:

1. abra `http://localhost:3000/app/billing`
2. clique em `Choose Monthly plan` ou `Choose Annual plan`
3. finalize o checkout com cartao de teste do Stripe

Evidencia esperada:

- o frontend chama `POST /billing/checkout`
- o navegador vai para o Stripe Checkout
- depois volta para `/app/billing?checkout=success...`
- a Stripe CLI mostra entrega para `POST /billing/stripe/webhook`

### 8.8 Confirmar subscription local

Com a mesma sessao ativa:

- `GET http://localhost:4000/billing/subscription`

Esperado:

- status `200`
- `data.entitled: true`
- subscription refletida localmente apos o webhook

### 8.9 Confirmar liberacao do dashboard

1. atualize `http://localhost:3000/app`
2. esperado:
  - o dashboard abre normalmente
  - nao ha novo redirecionamento para `/sign-in`
  - nao ha novo redirecionamento para `/app/billing`

### 8.10 Testar `/app/integrations`

1. abra `http://localhost:3000/app/integrations`
2. esperado:
  - a pagina carrega
  - `Mercado Livre` aparece como provider real
  - `Shopee` aparece como skeleton/indisponivel

### 8.11 Testar conexao Mercado Livre

Antes, confira no portal de developers:

- Redirect URI cadastrada:
  - `https://<NGROK_DOMAIN>/integrations/mercadolivre/callback`

Antes de clicar em `Connect account`, confirme tambem:

- `corepack pnpm ngrok:mercadolivre:callback` esta rodando
- `MERCADOLIVRE_REDIRECT_URI` aponta para a mesma URL publica do ngrok
- `BETTER_AUTH_URL` continua em `http://localhost:4000`
- `WEB_APP_ORIGIN` continua em `http://localhost:3000`

Agora teste:

1. clique em `Connect account` no card do Mercado Livre
2. autorize o app
3. aguarde o retorno ao app

Evidencia esperada:

- o frontend chama `POST /integrations/mercadolivre/connect`
- o navegador vai para `https://auth.mercadolivre.com.br/authorization`
- o callback chega em `https://<NGROK_DOMAIN>/integrations/mercadolivre/callback`
- o backend troca `code` por token
- o backend consulta `users/me`
- a conexao fica persistida
- o navegador volta para `/app/integrations?provider=mercadolivre&status=success...`

### 8.12 Confirmar estado local da conexao

Com a mesma sessao:

- `GET http://localhost:4000/integrations`

Esperado:

- status `200`
- `data` com provider `mercadolivre`
- `status: connected`
- `connectedAccountId` preenchido
- `connectedAccountLabel` preenchido quando houver `nickname` ou `email`

### 8.13 Testar sync manual em `/app/integrations`

Precondicao:

- Mercado Livre conectado
- usuario com entitlement ativo

Agora teste:

1. na tela `/app/integrations`, rode o sync manual do provider
2. acompanhe o estado na propria tela

Evidencia esperada:

- o frontend chama `POST /sync/run`
- o backend registra `processing`, depois `completed` ou `failed`
- a UI mostra historico e status recente

### 8.14 Testar bloqueio na mesma janela

1. depois de um sync concluido com sucesso, tente rodar novo sync na mesma janela do dia
2. esperado:
  - o backend bloqueia o novo sync
  - a UI mostra mensagem de indisponibilidade e proxima janela permitida

### 8.15 Confirmar refresh de metricas e dashboard

1. volte para `http://localhost:3000/app`
2. esperado:
  - KPI cards carregam
  - graficos carregam
  - recent sync aparece
  - os dados refletem o backend calculado

### 8.16 Testar sign out e protecao novamente

1. faca sign out
2. tente abrir `http://localhost:3000/app`
3. tente abrir `GET http://localhost:4000/auth-state/protected`

Esperado:

- no web: volta para `/sign-in`
- na API sem sessao: `401`

Se testar com sessao mas sem entitlement:

- `GET /auth-state/protected` deve retornar `402`

Com sessao e entitlement:

- `GET /auth-state/protected` deve retornar `200`

## 9. Como destravar os milestones ainda abertos

Esta secao nao fecha milestone automaticamente.

Ela so diz qual evidencia falta hoje para considerar cada bloqueio destravado.

### M5 - Google login/callback real no browser

Precondicoes:

- `BETTER_AUTH_URL` correto
- `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` corretos
- redirect URI `http://localhost:4000/auth/callback/google` cadastrada no Google Cloud

Acao exata:

1. abrir `/sign-in`
2. clicar em `Continue with Google`
3. concluir o login real
4. confirmar sessao em `GET /auth-state/me`

Evidencia esperada:

- redirecionamento para Google
- retorno ao app sem erro de callback
- sessao criada com organizacao provisionada

Criterio para considerar destravado:

- login Google completo no browser funcionando de ponta a ponta

### M6 - Checkout Stripe + webhook refletido localmente

Precondicoes:

- `STRIPE_SECRET_KEY`, `STRIPE_PRICE_MONTHLY` e `STRIPE_PRICE_ANNUAL` validos
- `stripe listen` rodando
- `STRIPE_WEBHOOK_SECRET` atualizado no `.env`

Acao exata:

1. abrir `/app/billing`
2. iniciar checkout
3. concluir pagamento de teste
4. verificar `GET /billing/subscription`

Evidencia esperada:

- webhook entregue com sucesso
- `data.entitled: true`
- `/app` deixa de redirecionar para `/app/billing`

Criterio para considerar destravado:

- checkout + webhook + entitlement local confirmados no fluxo real

### M10 - Callback Mercado Livre com conexao persistida

Precondicoes:

- `MERCADOLIVRE_CLIENT_ID` e `MERCADOLIVRE_CLIENT_SECRET` validos
- redirect URI do Mercado Livre alinhada com `https://<NGROK_DOMAIN>/integrations/mercadolivre/callback`
- tunnel `corepack pnpm ngrok:mercadolivre:callback` rodando
- usuario com entitlement ativo

Acao exata:

1. abrir `/app/integrations`
2. clicar em `Connect account`
3. autorizar no Mercado Livre
4. validar `GET /integrations`

Evidencia esperada:

- callback concluido
- provider `mercadolivre` com `status: connected`
- conta conectada persistida localmente

Criterio para considerar destravado:

- conexao Mercado Livre real concluida e visivel no app/API

### M11 - Primeiro sync real, historico e bloqueio por janela

Precondicoes:

- M10 validado
- conta Mercado Livre conectada
- usuario com entitlement ativo

Acao exata:

1. rodar sync manual em `/app/integrations`
2. validar historico/status
3. tentar novo sync na mesma janela
4. voltar ao dashboard

Evidencia esperada:

- run criado e concluido
- historico visivel
- novo sync bloqueado na mesma janela
- metricas/reflexos atualizados no dashboard

Criterio para considerar destravado:

- sync real validado com bloqueio correto e refresh de metricas

### M12 - Dashboard funcional confirmado pelo usuario

Precondicoes:

- usuario autenticado
- entitlement ativo
- preferencialmente dados reais apos sync

Acao exata:

1. abrir `/app`
2. revisar KPI, charts, recent sync e profitability
3. confirmar se a tela atende o comportamento esperado

Evidencia esperada:

- dashboard abre sem redirecionamento indevido
- dados carregam sem erro
- a experiencia funcional e aceita no browser

Criterio para considerar destravado:

- confirmacao explicita do usuario de que o milestone pode ser considerado concluido

## 10. Endpoints uteis durante o teste

### Infra

- `GET /health`

### Auth

- `GET /auth-state/me`
- `GET /auth-state/protected`

### Billing

- `GET /billing/subscription`
- `POST /billing/checkout`
- `POST /billing/stripe/webhook`

### Integracoes

- `GET /integrations`
- `POST /integrations/mercadolivre/connect`
- `POST /integrations/:provider/disconnect`

### Sync

- `GET /sync/status?provider=mercadolivre`
- `GET /sync/history?provider=mercadolivre`
- `POST /sync/run`

### Dashboard

- `GET /dashboard/summary`
- `GET /dashboard/charts`
- `GET /dashboard/recent-sync`
- `GET /dashboard/profitability`

## 11. Troubleshooting

### `NEXT_PUBLIC_APP_URL` ou `NEXT_PUBLIC_API_BASE_URL` ausentes

Sintomas:

- `/sign-in` quebra antes do auth iniciar
- erro de validacao de env no frontend

Acao:

- confira `.env`
- confira se `dev:web` foi reiniciado
- confira overrides em `apps/web/.env.local`

### `DATABASE_URL` invalida ou Postgres fora do ar

Sintomas:

- API nao sobe
- migracoes falham
- dashboard e sync nao funcionam

Acao:

- revise host, porta, usuario, senha e database

### `BETTER_AUTH_URL` incorreta

Sintomas:

- callback Google falha
- links de auth apontam para destino errado

Acao:

- use `http://localhost:4000` em local

### `WEB_APP_ORIGIN` ou `AUTH_TRUSTED_ORIGINS` incorretas

Sintomas:

- cookies nao persistem
- login/logout inconsistentes
- requests autenticadas falham

Acao:

- alinhe ambas com `http://localhost:3000`

### Callback Google nao cadastrada

Sintomas:

- erro de `redirect_uri_mismatch`

Acao:

- confirme `http://localhost:4000/auth/callback/google` no Google Cloud

### `STRIPE_WEBHOOK_SECRET` incorreta

Sintomas:

- checkout conclui, mas entitlement nao atualiza
- webhook falha por assinatura

Acao:

1. rode novamente:

```powershell
stripe listen --forward-to http://localhost:4000/billing/stripe/webhook
```

1. copie o novo `whsec_...`
2. atualize `.env`
3. reinicie a API

### Price IDs Stripe errados

Sintomas:

- checkout nao abre
- plano errado e usado
- subscription nao corresponde ao esperado

Acao:

- revise `STRIPE_PRICE_MONTHLY`
- revise `STRIPE_PRICE_ANNUAL`

### Callback Mercado Livre nao fecha

Sintomas:

- falha ao autorizar
- retorno nao persiste conexao
- app volta com erro em `/app/integrations`

Acao:

- confirme `MERCADOLIVRE_CLIENT_ID`
- confirme `MERCADOLIVRE_CLIENT_SECRET`
- confirme `MERCADOLIVRE_REDIRECT_URI`
- confirme `NGROK_DOMAIN`
- confirme que `corepack pnpm ngrok:mercadolivre:callback` esta rodando
- confirme a redirect URI cadastrada no portal do provider

### Sync nao roda

Sintomas:

- botao bloqueado
- API responde indisponibilidade

Acao:

- confirme entitlement ativo
- confirme provider conectado
- confirme se a janela atual ja nao foi usada

## 12. Checklist final de ambiente pronto

Considere o ambiente pronto quando tudo abaixo estiver verdadeiro:

- `.env` preenchido com URLs locais corretas
- Postgres acessivel por `DATABASE_URL`
- `corepack pnpm install` concluido
- `corepack pnpm db:migrate` concluido
- `corepack pnpm dev:api` sobe com `/health` ok
- `corepack pnpm dev:web` abre o site
- `corepack pnpm lint`, `typecheck` e `test` passam
- `/app` sem sessao redireciona para `/sign-in`
- login Google funciona
- usuario sem entitlement vai para `/app/billing`
- checkout Stripe funciona com webhook refletido
- `/app` abre o dashboard apos entitlement
- `/app/integrations` abre corretamente
- conexao Mercado Livre funciona, se as credenciais reais estiverem disponiveis
- sync manual funciona e respeita a regra da janela
- dashboard mostra dados coerentes apos sync

