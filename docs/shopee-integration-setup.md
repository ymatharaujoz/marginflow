# Configuração da integração Shopee

## Objetivo

Este guia mostra, de forma direta, como:

1. configurar o app na Shopee Open Platform;
2. cadastrar callback e webhook corretos;
3. preencher as envs da API do Lucreii;
4. conectar a loja na aplicação;
5. validar sincronização manual, sincronização automática e importação de catálogo.

## Pré-requisitos

- Acesso administrativo ao Lucreii.
- Acesso ao painel da Shopee Open Platform.
- API do Lucreii publicada em URL HTTPS pública.
- Web app do Lucreii publicado e funcionando.
- Loja Shopee correta para autorizar o app.

## Envs necessárias

Preencha no serviço da API:

```env
SHOPEE_PARTNER_ID=<partner_id>
SHOPEE_PARTNER_KEY=<partner_key>
SHOPEE_REDIRECT_URI=https://<api-publica>/integrations/shopee/callback
SHOPEE_WEBHOOK_URL=https://<api-publica>/integrations/shopee/webhook
```

Envs-base relevantes para o fluxo:

```env
API_PUBLIC_BASE_URL=https://<api-publica>
WEB_APP_ORIGIN=https://<web-publica>
BETTER_AUTH_URL=https://<api-publica>
DATABASE_URL=<database_url>
```

## Passo 1: criar o app na Shopee

1. Acesse o portal da Shopee Open Platform.
2. Crie uma nova aplicação.
3. Copie o `Partner ID`.
4. Copie o `Partner Key`.
5. Garanta que o app ficará associado à conta correta que vai autorizar a loja.

## Passo 2: cadastrar callback e webhook

Cadastre exatamente estas URLs no app da Shopee:

- Callback OAuth: `https://<api-publica>/integrations/shopee/callback`
- Webhook: `https://<api-publica>/integrations/shopee/webhook`

Regras importantes:

- As URLs devem bater exatamente com as envs.
- Use HTTPS público.
- Se mudar domínio, atualize Shopee e API juntos.

## Passo 3: habilitar permissões

Habilite no mínimo:

- `order_status_push`
- permissões de `Order`
- permissões de `Payment/Escrow`
- permissões de `Product/Listing` necessárias para leitura de catálogo

Sem escopos de produto, a importação de catálogo não funciona.

## Passo 4: configurar a API do Lucreii

1. Abra o serviço `apps/api`.
2. Preencha `SHOPEE_PARTNER_ID`.
3. Preencha `SHOPEE_PARTNER_KEY`.
4. Preencha `SHOPEE_REDIRECT_URI`.
5. Preencha `SHOPEE_WEBHOOK_URL`.
6. Confirme que `WEB_APP_ORIGIN` aponta para o frontend correto.
7. Refaça o deploy da API se necessário.

## Passo 5: conectar a loja no Lucreii

1. Entre no Lucreii.
2. Acesse `/app/integrations`.
3. No card da Shopee, clique em `Conectar`.
4. Autorize a loja correta no fluxo OAuth.
5. Volte para `/app/integrations`.
6. Confirme status `Conectado`.

Validação esperada:

- card da Shopee conectado;
- conta/loja exibida;
- sincronização disponível em modo `Automático + manual`.

## Passo 6: validar sincronização manual

1. Em `/app/integrations`, selecione Shopee no bloco de status.
2. Clique em `Sincronizar agora`.
3. Aguarde conclusão.
4. Confirme atualização de última sincronização.

Validação esperada:

- `sync_runs` com execução concluída;
- pedidos em `external_orders`;
- itens em `external_order_items`;
- taxas em `external_fees`, incluindo comissão, taxa fixa e frete quando retornados pela Shopee.

## Passo 7: validar sincronização automática

1. Gere uma venda de teste na loja Shopee conectada.
2. Aguarde o push da Shopee para o webhook.
3. Confira `/app/integrations`.
4. Confirme nova execução automática.

Validação esperada:

- webhook recebido sem erro de assinatura;
- sync automática disparada;
- pedido, itens e taxas persistidos;
- dados refletidos em pedidos e performance.

## Passo 8: validar importação de catálogo

1. Acesse `/app/products/catalog`.
2. Clique em `Importar produtos`.
3. Escolha `Shopee`.
4. Confirme a importação.
5. Revise o resultado.

Validação esperada:

- produtos Shopee importados com foto;
- modelos/variações importados como itens separados;
- SKU, preço e status atualizados;
- produtos existentes com SKU único vinculados automaticamente;
- conflitos de SKU duplicado reportados sem duplicação interna.

## Troubleshooting

### Callback falha

Verifique:

- `SHOPEE_REDIRECT_URI`
- URL cadastrada no app Shopee
- `WEB_APP_ORIGIN`
- se a loja autorizada é a mesma esperada

### Webhook falha

Verifique:

- `SHOPEE_WEBHOOK_URL`
- assinatura enviada pela Shopee
- se a API está acessível publicamente via HTTPS

### Sync manual funciona, mas automática não

Verifique:

- evento `order_status_push` habilitado
- webhook salvo na Shopee
- app e loja corretos

### Catálogo não importa

Verifique:

- permissões de produto/listagem no app Shopee
- conexão ainda ativa
- token válido
- SKU duplicado no catálogo interno

## Checklist final

- [ ] `Partner ID` configurado
- [ ] `Partner Key` configurado
- [ ] callback configurado na Shopee
- [ ] webhook configurado na Shopee
- [ ] escopos de `Order`, `Payment/Escrow` e `Product/Listing` habilitados
- [ ] Shopee conectada em `/app/integrations`
- [ ] sync manual validada
- [ ] sync automática validada
- [ ] importação de catálogo validada
