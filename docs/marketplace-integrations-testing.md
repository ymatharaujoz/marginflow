# Teste e configuracao das integracoes Mercado Livre e Shopee

## Objetivo

Este documento descreve como testar e validar as integracoes de marketplace do Lucreii em ambiente local ou sandbox:

- sincronizacao automatica apos venda no Mercado Livre
- importacao de produtos do Mercado Livre para o catalogo interno
- sincronizacao automatica apos venda na Shopee
- configuracao inicial da Shopee para quem nunca acessou o painel de desenvolvimento

O foco aqui e operacional: quais URLs configurar, quais variaveis preencher e quais passos seguir para confirmar que a integracao realmente esta funcionando.

## Escopo

- Ambiente principal: local + sandbox
- Nao cobre homologacao comercial nem ajustes de producao em detalhes
- Nao exige mudancas no codigo da aplicacao
- Nao depende de screenshots do painel da Shopee

## Visao rapida do fluxo

1. Configurar as variaveis da API.
2. Conectar o marketplace na pagina `/app/integrations`.
3. Validar callback, webhook e permissao de sincronizacao.
4. Executar uma venda de teste ou simular um evento de pedido.
5. Confirmar que a venda apareceu no painel e que os produtos foram criados ou vinculados no catalogo.

## Pre-requisitos

### Acesso e ambiente

- Acesso a uma conta de administrador no Lucreii.
- Acesso ao painel de desenvolvedor do Mercado Livre e da Shopee.
- Acesso ao ambiente local da API e do web app.
- Acesso a um tunel HTTPS publico para testes locais do Mercado Livre, via ngrok.

### Variaveis de ambiente da API

As variaveis abaixo ja existem no projeto e devem estar configuradas no servico da API:

```env
MERCADOLIVRE_CLIENT_ID=
MERCADOLIVRE_CLIENT_SECRET=
MERCADOLIVRE_REDIRECT_URI=https://<seu-dominio-ngrok>/integrations/mercadolivre/callback
MERCADOLIVRE_USE_PKCE=true

SHOPEE_PARTNER_ID=
SHOPEE_PARTNER_KEY=
SHOPEE_REDIRECT_URI=https://<api-publica>/integrations/shopee/callback
SHOPEE_WEBHOOK_URL=https://<api-publica>/integrations/shopee/webhook

SYNC_RELAX_GUARDS=false
```

Outras variaveis relevantes do projeto:

- `API_PUBLIC_BASE_URL`
- `WEB_APP_ORIGIN`
- `BETTER_AUTH_URL`
- `DATABASE_URL`
- `DATABASE_MIGRATION_URL`

### Comandos uteis do monorepo

No repositorio ja existem scripts para ajudar no fluxo local do Mercado Livre:

```bash
corepack pnpm ngrok:mercadolivre:callback
corepack pnpm ngrok:mercadolivre:callback:url
```

Esses comandos ajudam a publicar o endpoint local da API com HTTPS e a descobrir a URL publica para usar no callback.

## Mercado Livre: configuracao inicial

### 1. Criar o app no painel do Mercado Livre

1. Acesse o painel de desenvolvedor do Mercado Livre.
2. Crie uma nova aplicacao.
3. Habilite o fluxo OAuth.
4. Copie o `Client ID` e o `Client Secret`.
5. Se o app estiver com PKCE habilitado, mantenha `MERCADOLIVRE_USE_PKCE=true`.

### 2. Registrar os endpoints corretos

Configure exatamente estas URLs no app do Mercado Livre:

- Callback OAuth: `https://<seu-dominio-ngrok>/integrations/mercadolivre/callback`
- Webhook de vendas: `https://<seu-dominio-ngrok>/integrations/mercadolivre/webhook`

O projeto tambem aceita o alias de compatibilidade:

- `https://<seu-dominio-ngrok>/integrations/mercadolivre/notifications`

### 3. Conectar a conta no Lucreii

1. Entre no Lucreii.
2. Acesse `/app/integrations`.
3. Localize o card do Mercado Livre.
4. Clique em `Conectar`.
5. Autorize o acesso com a conta de vendedor correta.
6. Confirme que o card ficou como `Conectado`.

### 4. Validar o estado basico

Depois da conexao, confirme:

- o nome da conta conectada aparece no card
- a integracao nao esta marcada como `Reconexao necessaria`
- a pagina mostra `Sincronizar agora`
- a tela indica que o modo do Mercado Livre e `Automatico + manual`

## Mercado Livre: teste de sincronizacao automatica apos venda

### Objetivo do teste

Validar que uma venda nova gera notificacao, inicia sincronizacao automatica e grava os dados do pedido no sistema.

### Passo a passo

1. Confirme que a conta do Mercado Livre esta conectada em `/app/integrations`.
2. Garanta que o webhook do Mercado Livre esta apontando para o tunel HTTPS ativo.
3. Crie uma venda de teste na conta Mercado Livre conectada.
4. Aguarde a notificacao de pedido.
5. Abra `/app/integrations` e confira se a ultima sincronizacao foi atualizada.
6. Se necessario, use `Sincronizar agora` para validar a sincronizacao manual na mesma conta.
7. Abra o historico de sincronizacao e confirme que existe um run concluido recente.

### Resultado esperado

- a venda disparou uma sincronizacao automatica
- o painel mostra ultima sincronizacao recente
- o pedido foi importado para o motor de sync
- os itens relacionados aparecem vinculados aos produtos externos

### O que validar tecnicamente, se voce tiver acesso ao banco

Verifique se existem registros novos em:

- `sync_runs`
- `external_orders`
- `external_order_items`
- `external_fees`

Se a venda existir no painel do marketplace, mas nao aparecer no Lucreii, revise:

- `MERCADOLIVRE_REDIRECT_URI`
- URL do webhook
- se o tunel ngrok esta ativo
- se o token da conexao nao expirou

## Mercado Livre: teste de importacao de produtos

### Objetivo do teste

Validar que o catalogo do Mercado Livre pode ser importado para o catalogo interno e que os produtos podem ser criados ou vinculados.

### Passo a passo

1. Confirme que a conta do Mercado Livre esta conectada.
2. Abra `/app/products/catalog`.
3. Clique em `Importar produtos`.
4. Aguarde o processamento do catalogo.
5. Revise os itens criados, atualizados ou vinculados.
6. Abra alguns produtos importados e confirme nome, SKU, preco e imagens.

### O que o sistema faz

- importa itens ativos e pausados do catalogo Mercado Livre
- normaliza variações como produtos externos distintos
- cria produto interno quando nao encontra correspondencia
- vincula ao produto existente quando o SKU ou o vinculo anterior batem
- atualiza imagens do Mercado Livre no produto interno

### Casos que merecem atencao

- se o SKU do item externo corresponder a mais de um produto interno, o sistema marca conflito
- se um item ja foi importado anteriormente, ele deve ser reaproveitado e nao duplicado
- se o token estiver expirado, a importacao deve falhar ate a conta ser reconectada

## Shopee: configuracao inicial para quem nunca entrou no painel de desenvolvimento

### Objetivo

Deixar a integracao da Shopee pronta do zero, mesmo para quem nunca navegou no painel da plataforma.

### 1. Entrar no painel correto

1. Acesse o portal de desenvolvimento da Shopee Open Platform.
2. Entre com a conta corporativa ou de desenvolvedor que sera dona da aplicacao.
3. Localize a area de criacao de aplicativos.

Se o painel mostrar termos diferentes, procure por estes conceitos:

- `App`
- `Partner ID`
- `Partner Key`
- `Redirect URL`
- `Webhook URL`
- `Permissions`

### 2. Criar a aplicacao

1. Crie uma nova aplicacao.
2. Copie o `Partner ID`.
3. Copie o `Partner Key`.
4. Defina a URL de callback da aplicacao.
5. Defina a URL de webhook para eventos de pedido.

### 3. Configurar URLs exatas

Cadastre as seguintes URLs no painel da Shopee e na API:

- Callback: `https://<api-publica>/integrations/shopee/callback`
- Webhook: `https://<api-publica>/integrations/shopee/webhook`

Essas URLs precisam bater exatamente entre Shopee e Lucreii.
Se voce estiver testando em local, use um dominio HTTPS publico equivalente ao ngrok
que voce usa no Mercado Livre.

### 4. Habilitar permissões

Habilite pelo menos:

- `order_status_push`
- permissao de `Order`
- permissao de `Payment/Escrow`

### 5. Preencher as variaveis no Lucreii

Configure na API:

```env
SHOPEE_PARTNER_ID=<partner_id>
SHOPEE_PARTNER_KEY=<partner_key>
SHOPEE_REDIRECT_URI=https://<api-publica>/integrations/shopee/callback
SHOPEE_WEBHOOK_URL=https://<api-publica>/integrations/shopee/webhook
```

### 6. Conectar a Shopee no Lucreii

1. Entre no Lucreii.
2. Acesse `/app/integrations`.
3. Clique em `Conectar` no card da Shopee.
4. Autorize a loja correta.
5. Confirme o retorno para `/app/integrations` com status `Conectado`.

### Observacao importante

Nesta versao da integracao, a Shopee nao exige Cron, worker ou Redis para funcionar. O fluxo depende de OAuth, webhook e sincronizacao sob demanda.

## Shopee: teste de sincronizacao automatica apos venda

### Objetivo do teste

Validar que uma nova venda na Shopee gera push, chega ao webhook da API e dispara a sincronizacao.

### Passo a passo

1. Confirme que a Shopee esta conectada em `/app/integrations`.
2. Confirme que o webhook publico da Shopee esta ativo e respondendo.
3. Gere uma venda de teste na loja Shopee conectada.
4. Aguarde o evento de pedido chegar na API.
5. Verifique o card da Shopee em `/app/integrations`.
6. Confira a ultima sincronizacao e o historico de runs.
7. Se precisar, acione `Sincronizar agora` para validar a sincronizacao manual.

### Resultado esperado

- o webhook chega com o pedido correto
- a sincronizacao automatica inicia sem erro
- os pedidos e itens externos sao gravados
- o historico de sync mostra a execucao recente

### Sinais de que algo falhou

- a venda existe na Shopee, mas nao apareceu no Lucreii
- o card permanece como desconectado ou com reconexao necessaria
- o webhook retorna erro de assinatura
- o token expirou e a loja precisa ser reconectada

## Checklist final de validacao

### Mercado Livre

- [ ] app criado no painel do Mercado Livre
- [ ] `Client ID` e `Client Secret` configurados
- [ ] callback OAuth configurado
- [ ] webhook de vendas configurado
- [ ] conta conectada em `/app/integrations`
- [ ] venda de teste disparou sincronizacao automatica
- [ ] importacao de produtos funcionou em `/app/products/catalog`

### Shopee

- [ ] app criado no painel da Shopee
- [ ] `Partner ID` e `Partner Key` configurados
- [ ] callback configurado
- [ ] webhook configurado
- [ ] permissao `order_status_push` habilitada
- [ ] permissoes de `Order` e `Payment/Escrow` habilitadas
- [ ] conta conectada em `/app/integrations`
- [ ] venda de teste disparou sincronizacao automatica

## Troubleshooting

### Mercado Livre

- Se a conexao nao completa, confira se `MERCADOLIVRE_REDIRECT_URI` e a URL publica correta.
- Se a venda nao sincroniza, confirme o webhook no tunel ngrok e veja se a conta ainda esta conectada.
- Se o catalogo nao importa, revise token expirado, conflito de SKU e permissao da conta.

### Shopee

- Se o callback falha, confira `SHOPEE_REDIRECT_URI`, `Partner ID` e `Partner Key`.
- Se o webhook falha, confirme `SHOPEE_WEBHOOK_URL` e a assinatura esperada pela Shopee.
- Se a sincronizacao nao dispara, confirme que a notificacao de pedido esta habilitada e que a conta conectada e a mesma da loja que gerou a venda.

## Referencias internas

- `apps/api/README.md`
- `apps/api/.env.example`
- `apps/web/src/modules/integrations/components/connected-marketplaces-section.tsx`
- `apps/web/src/modules/integrations/components/sync-control-card.tsx`
- `apps/web/src/modules/integrations/components/sync-status-grid.tsx`
