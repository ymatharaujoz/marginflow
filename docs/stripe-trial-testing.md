# Teste do trial Stripe de 7 dias

## Objetivo

Validar que um e-mail recebe um Ãºnico trial de 7 dias, informa cartÃ£o no Stripe Checkout e
sÃ³ Ã© cobrado depois do trial. Assinaturas `trialing` e `active` liberam acesso; `past_due`,
`unpaid`, `paused` e `canceled` bloqueiam acesso.

O trial Ã© configurado pela API na Checkout Session. Os Prices mensal e anual continuam
recorrentes e nÃ£o precisam de configuraÃ§Ã£o de trial no Stripe Dashboard.

## PrÃ©-requisitos

Use somente chaves do Stripe Sandbox/Test mode:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_START_MONTHLY=price_1TiiHEAcc6lqNf7obNTfV2UF
STRIPE_PRICE_START_ANNUAL=price_1TiiHfAcc6lqNf7o1HBx8o6c
STRIPE_PRICE_PRO_MONTHLY=price_1TiiI0Acc6lqNf7oijT1DqqH
STRIPE_PRICE_PRO_ANNUAL=price_1TiiICAcc6lqNf7olbaW6UZw
STRIPE_PRICE_BUSINESS_MONTHLY=price_1TiiItAcc6lqNf7oYZv2jHVt
STRIPE_PRICE_BUSINESS_ANNUAL=price_1TiiJBAcc6lqNf7osFGYo2ko
WEB_APP_ORIGIN=http://localhost:3000
```

Confirme que ambos os Prices estÃ£o ativos, usam a moeda esperada e tÃªm recorrÃªncia
`month` e `year`, respectivamente.

Aplique as migraÃ§Ãµes antes do teste:

```bash
corepack pnpm db:migrate
```

## Webhook local

Instale e autentique o Stripe CLI. Em seguida:

```bash
stripe login
stripe listen --forward-to localhost:4000/billing/stripe/webhook
```

Copie o `whsec_...` exibido para `STRIPE_WEBHOOK_SECRET` e reinicie a API.

No endpoint de produÃ§Ã£o, habilite estes eventos:

- `checkout.session.completed`
- `checkout.session.expired`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## Fluxo de sucesso

1. Crie conta com e-mail ainda nÃ£o presente em `billing_trials`.
2. Abra `/app/billing`.
3. Confirme textos â€œTeste grÃ¡tis por 7 diasâ€, â€œCartÃ£o obrigatÃ³rioâ€ e cobranÃ§a automÃ¡tica.
4. Teste primeiro plano mensal e depois repita com outro e-mail no anual.
5. Use cartÃ£o `4242 4242 4242 4242`, validade futura e qualquer CVC.
6. Conclua Checkout.
7. Confirme redirecionamento, onboarding e acesso Ã s rotas protegidas.
8. No Stripe Dashboard, confirme assinatura `trialing`, cartÃ£o salvo e `trial_end` em 7 dias.
9. No banco, confirme:

```sql
select user_id, email, checkout_session_id, interval, reserved_until, redeemed_at
from billing_trials
order by created_at desc;

select status, interval, trial_start, trial_end, current_period_start, current_period_end
from subscriptions
order by updated_at desc;
```

`redeemed_at` deve estar preenchido somente apÃ³s Checkout concluÃ­do. `trial_start` e
`trial_end` devem refletir os timestamps retornados pela Stripe.

## Reuso, troca e expiraÃ§Ã£o

1. Inicie Checkout e volte sem concluir.
2. Clique novamente no mesmo intervalo: a aplicaÃ§Ã£o deve reutilizar a sessÃ£o aberta.
3. Troque mensal por anual: a sessÃ£o anterior deve ser expirada e substituÃ­da.
4. Expire a sessÃ£o pelo Stripe Dashboard ou CLI.
5. Confirme recebimento de `checkout.session.expired`.
6. Confirme que `checkout_session_id`, `interval` e `reserved_until` foram limpos e que o
   trial ainda estÃ¡ disponÃ­vel.

## Trial Ãºnico por e-mail

1. Conclua o primeiro Checkout.
2. Cancele a assinatura pelo Customer Portal.
3. Aguarde ou force sincronizaÃ§Ã£o atÃ© status local `canceled`.
4. Inicie novo Checkout usando a mesma conta.
5. Confirme que Checkout mostra cobranÃ§a imediata e a assinatura nova nÃ£o possui trial.

Contas histÃ³ricas com `pending_checkouts.status` igual a `confirmed` ou `completed` sÃ£o
marcadas como trial jÃ¡ utilizado pela migraÃ§Ã£o `0011_billing_trials.sql`.

## Fim do trial e primeira cobranÃ§a

No Stripe Dashboard em modo sandbox:

1. Abra a assinatura.
2. Use **Run simulation** na Ã¡rea de Billing para criar uma simulaÃ§Ã£o/Test Clock.
3. Avance o relÃ³gio para depois de `trial_end`.
4. Confirme emissÃ£o da primeira invoice e transiÃ§Ã£o da assinatura.

Com cartÃ£o de sucesso, resultado esperado:

- invoice paga;
- assinatura muda de `trialing` para `active`;
- webhook `customer.subscription.updated` atualiza estado local;
- acesso continua liberado.

## Falha da primeira cobranÃ§a

Para simular cartÃ£o salvo que falha em cobranÃ§a posterior, use
`4000 0000 0000 0341` no Sandbox. O mÃ©todo pode ser anexado, mas cobranÃ§as falham.

1. Conclua Checkout com trial.
2. Avance a simulaÃ§Ã£o/Test Clock alÃ©m de `trial_end`.
3. Confirme invoice nÃ£o paga e assinatura `past_due`.
4. Confirme webhook `customer.subscription.updated`.
5. Consulte `GET /billing/subscription`: `entitled` deve ser `false`.
6. Confirme redirecionamento das rotas protegidas para `/app/billing`.
7. Atualize cartÃ£o pelo Customer Portal e pague a invoice.
8. ApÃ³s Stripe retornar assinatura para `active`, confirme acesso restaurado.

A polÃ­tica de retries/cancelamento final continua configurada no Stripe Billing. Lucreii
bloqueia acesso assim que o status recebido deixa de ser `trialing` ou `active`.

## DiagnÃ³stico

- Checkout nÃ£o pede cartÃ£o: confirme `payment_method_collection=always`.
- Trial nÃ£o aparece: confirme que `billing_trials.redeemed_at` estÃ¡ nulo para o e-mail.
- Novo trial indevido: confirme entrega de `checkout.session.completed` e execuÃ§Ã£o da
  confirmaÃ§Ã£o de Checkout no retorno da aplicaÃ§Ã£o.
- UI nÃ£o atualiza: consulte `GET /billing/subscription`; essa rota reconcilia assinatura com
  Stripe antes de retornar o snapshot.
- Webhook retorna 400: confirme corpo bruto e `STRIPE_WEBHOOK_SECRET` do listener atual.

## ReferÃªncias

- [Stripe Checkout free trials](https://docs.stripe.com/payments/checkout/free-trials)
- [Stripe Billing simulations](https://docs.stripe.com/billing/testing/test-clocks/simulate-subscriptions)
- [Stripe webhook testing](https://docs.stripe.com/webhooks/test)
