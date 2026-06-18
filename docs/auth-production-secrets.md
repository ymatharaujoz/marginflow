# Secrets de Produção do Auth

Guia de produção para `apps/api` no Railway e `apps/web` na Vercel.

Este documento cobre:

- o que `BETTER_AUTH_SECRET`, `BETTER_AUTH_API_KEY` e `WEB_SESSION_SECRET` fazem
- como gerar cada valor com segurança
- onde configurar cada valor em produção
- como validar se a configuração está correta
- por que o erro atual de login aponta primeiro para handoff de cookie, não para esses secrets

## Visão Geral

No setup atual do Lucreii:

- `apps/api` roda no Railway e é dono da autenticação remota
- `apps/web` roda na Vercel e mantém uma sessão SSR local separada
- o cookie remoto da API é `lucreii_api_session`
- o cookie SSR do web é `lucreii.web_session`

Fluxo resumido:

1. browser envia `POST /auth/sign-in` para API Railway
2. API responde com cookie `lucreii_api_session`
3. browser navega para `GET /auth/finalize?next=...` na API Railway
4. API lê `lucreii_api_session`, gera ticket e redireciona para `https://www.lucreii.com.br/auth/complete`
5. web troca ticket por sessão SSR local e assina `lucreii.web_session`

Referências no código:

- `apps/api/src/modules/auth/auth-public.controller.ts`
- `apps/api/src/app.ts`
- `apps/web/src/lib/web-auth-session.ts`

## Tabela Rápida

| Variável | Dono | Obrigatória | Uso real | Impacto se faltar/errar |
| --- | --- | --- | --- | --- |
| `BETTER_AUTH_SECRET` | Railway / `apps/api` | Sim | Segredo principal do Better Auth no backend | Pode invalidar emissão/validação de sessão do auth |
| `BETTER_AUTH_API_KEY` | Railway / `apps/api` | Não na maioria dos casos | Chave da infraestrutura/dashboard do Better Auth | Não costuma quebrar login básico por email/senha |
| `WEB_SESSION_SECRET` | Vercel / `apps/web` | Sim em produção | Assina a sessão SSR local do web | Quebra criação/leitura de `lucreii.web_session` |

## O Que Cada Secret Faz

### `BETTER_AUTH_SECRET`

É segredo do backend auth no Railway. Deve existir somente no projeto da API.

Use para:

- assinatura/segurança interna do Better Auth
- consistência da sessão remota emitida pela API

Não use:

- o mesmo valor em dev, staging e produção
- valor curto ou previsível
- secret com whitespace acidental no começo/fim

### `BETTER_AUTH_API_KEY`

É chave de infraestrutura do Better Auth. No código atual do Lucreii ela é opcional, e a própria documentação interna do projeto já trata essa variável como necessária apenas para Better Auth Dashboard / ownership verification.

Use para:

- integrar com dashboard/infraestrutura do Better Auth
- ownership verification quando esse fluxo estiver habilitado

Não assuma:

- que ela é necessária para login básico com email/senha
- que ela resolve erro de cookie entre Vercel e Railway

### `WEB_SESSION_SECRET`

É segredo do projeto web na Vercel. Ele assina a sessão SSR local `lucreii.web_session`.

No código atual, `apps/web/src/lib/web-auth-session.ts` usa esta ordem:

1. `WEB_SESSION_SECRET`
2. `AUTH_SESSION_SECRET`
3. `BETTER_AUTH_SECRET`

Em produção, recomendação é usar `WEB_SESSION_SECRET` próprio, separado do `BETTER_AUTH_SECRET`.

## Como Gerar `BETTER_AUTH_SECRET`

Escolha um método. Gere uma vez e salve no Railway sem alterar formatação.

### Opção recomendada: CLI do Better Auth

```bash
npx auth@latest secret
```

Esse comando gera um secret próprio para Better Auth.

### Opção PowerShell

```powershell
[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Maximum 256 } | ForEach-Object { [byte]$_ }))
```

Se preferir hexadecimal:

```powershell
-join ((1..64 | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) }))
```

### Opção Node.js

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

### Opção OpenSSL

```bash
openssl rand -hex 32
```

### Onde configurar

- Railway
- Serviço da API (`apps/api`)
- Variável: `BETTER_AUTH_SECRET`

### Como validar

- deploy da API sobe sem erro de env ausente
- login básico não falha por configuração interna de auth
- sessões antigas podem ser invalidadas se você rotacionar esse valor

## Como Obter `BETTER_AUTH_API_KEY`

Configure esta variável apenas se você realmente usa Better Auth Infrastructure / Dashboard / ownership verification.

Fonte oficial usada nesta orientação: documentação atual do Better Auth via Context7, baseada em `docs/content/docs/infrastructure/getting-started.mdx`.

### Passo a passo

1. Abra o dashboard/infraestrutura do Better Auth da sua organização/projeto.
2. Gere ou copie a API key fornecida por lá.
3. Salve a chave no Railway como `BETTER_AUTH_API_KEY`.
4. Faça redeploy da API se o Railway não reiniciar automaticamente.

Exemplo de configuração:

```dotenv
BETTER_AUTH_API_KEY=your_api_key_here
```

### Quando ela é necessária

- quando você quer usar o dashboard/infraestrutura do Better Auth
- quando ownership verification depende dessa chave

### Quando ela normalmente não é necessária

- login por email/senha do fluxo atual
- emissão do cookie `lucreii_api_session`
- leitura do cookie em `/auth/finalize`

## Como Gerar `WEB_SESSION_SECRET`

Use secret forte e separado do `BETTER_AUTH_SECRET`.

### Opção PowerShell

```powershell
-join ((1..64 | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) }))
```

### Opção Node.js

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

### Opção OpenSSL

```bash
openssl rand -hex 32
```

### Onde configurar

- Vercel
- Projeto web (`apps/web`)
- Variável: `WEB_SESSION_SECRET`

### Como validar

- páginas SSR autenticadas param de falhar por secret ausente
- `/auth/complete` consegue criar `lucreii.web_session`
- requests SSR autenticados conseguem reaproveitar sessão local

## Onde Configurar em Produção

### Railway (`apps/api`)

Valores essenciais de auth:

```dotenv
NODE_ENV=production
BETTER_AUTH_URL=https://marginflow-production.up.railway.app/auth
API_PUBLIC_BASE_URL=https://marginflow-production.up.railway.app
WEB_APP_ORIGIN=https://www.lucreii.com.br
AUTH_TRUSTED_ORIGINS=https://www.lucreii.com.br
BETTER_AUTH_SECRET=<gerado-com-segurança>
BETTER_AUTH_API_KEY=<somente-se-usar-dashboard-ou-ownership-verification>
```

### Vercel (`apps/web`)

```dotenv
NEXT_PUBLIC_APP_URL=https://www.lucreii.com.br
NEXT_PUBLIC_API_BASE_URL=https://marginflow-production.up.railway.app
WEB_SESSION_SECRET=<gerado-com-segurança-e-diferente-do-backend>
```

## Checklist de Rotação Segura

Antes de trocar qualquer secret:

1. gere novo valor fora do repositório
2. atualize primeiro no provedor correto
3. faça redeploy do serviço afetado
4. valide login manualmente
5. confirme impacto em sessões existentes

Regras:

- não reutilize secret entre ambientes
- não versione secret em `.env.example`, commit, issue ou PR
- não copie secret de desenvolvimento para produção
- não compartilhe secret em chat, screenshot ou log
- não troque `BETTER_AUTH_SECRET` sem esperar invalidação de sessões remotas
- não troque `WEB_SESSION_SECRET` sem esperar invalidação de sessões SSR locais

## O Que Não Fazer

- não usar mesmo valor para `BETTER_AUTH_SECRET` e `WEB_SESSION_SECRET`
- não deixar `BETTER_AUTH_API_KEY` como requisito mental para todo bug de login
- não apontar `BETTER_AUTH_URL` para domínio web da Vercel
- não configurar `WEB_APP_ORIGIN` diferente do domínio real do frontend
- não esquecer `AUTH_TRUSTED_ORIGINS=https://www.lucreii.com.br`

## Validação Manual Pós-Deploy

1. abrir `https://www.lucreii.com.br/sign-in`
2. realizar login com email/senha
3. confirmar que `POST /auth/sign-in` responde com cookie `lucreii_api_session`
4. confirmar que em produção esse cookie sai com `SameSite=None; Secure`
5. confirmar que request seguinte para `GET /auth/finalize?next=%2Fapp` envia `lucreii_api_session`
6. confirmar redirect para `/auth/complete`
7. confirmar criação de `lucreii.web_session`
8. confirmar acesso SSR em `/app`

## Troubleshooting do Erro Atual

Log reportado:

```text
[lucreii/api] Public auth sign-up issued session cookie. { sameSite: 'None', secure: true }
[lucreii/api] Internal auth finalize missing session cookie. {
  hasApiSessionCookie: false,
  hasCookieHeader: false,
  nextPath: '/app',
  origin: 'https://marginflow-production.up.railway.app',
  path: '/auth/finalize?next=%2Fapp'
}
```

Leitura correta desse log:

- `POST /auth/sign-in` ou `/auth/sign-up` conseguiu emitir cookie
- `GET /auth/finalize` não recebeu nenhum header `Cookie`
- portanto problema principal está no handoff do cookie remoto entre browser e Railway

Hipóteses mais prováveis:

- browser não armazenou cookie cross-site
- browser não reenviou cookie cross-site
- redirect/navegação para `/auth/finalize` ocorreu em contexto onde cookie não acompanhou request
- origin/domínio/proxy alterou comportamento do navegador
- política de navegador, extensão, ITP ou bloqueio de third-party cookie interferiu

Hipóteses secundárias:

- `BETTER_AUTH_SECRET` incorreto no backend
- `WEB_SESSION_SECRET` ausente no web
- `BETTER_AUTH_API_KEY` ausente

Essas hipóteses são secundárias porque o log mostra ausência de `Cookie` header já na entrada de `/auth/finalize`. `WEB_SESSION_SECRET` ainda nem participa desse passo, e `BETTER_AUTH_API_KEY` não é parte central do login básico.

## Checklist Objetivo Para Esse Erro

Verifique nesta ordem:

1. `BETTER_AUTH_URL` está em `https://marginflow-production.up.railway.app/auth`
2. `API_PUBLIC_BASE_URL` está em `https://marginflow-production.up.railway.app`
3. `WEB_APP_ORIGIN` está em `https://www.lucreii.com.br`
4. `AUTH_TRUSTED_ORIGINS` contém `https://www.lucreii.com.br`
5. resposta de `POST /auth/sign-in` ou `POST /auth/sign-up` inclui `Set-Cookie: lucreii_api_session=...; SameSite=None; Secure; HttpOnly`
6. browser realmente grava esse cookie para domínio Railway
7. navegação seguinte para `/auth/finalize` vai para mesmo origin Railway
8. request de `/auth/finalize` leva `Cookie: lucreii_api_session=...`
9. só depois disso vale investigar rotação/correção de secret

## Resumo Final

- `BETTER_AUTH_SECRET` é secret obrigatório do auth no Railway
- `WEB_SESSION_SECRET` é secret obrigatório do SSR no Vercel
- `BETTER_AUTH_API_KEY` é opcional para fluxo básico atual
- erro atual de login parece primeiro problema de cookie handoff cross-site, não de geração desses secrets
