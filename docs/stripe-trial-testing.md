# Teste do trial Stripe de 7 dias

## Objetivo

Validar que um e-mail recebe um único trial de 7 dias, informa cartão no Stripe Checkout e
só é cobrado depois do trial. Assinaturas `trialing` e `active` liberam acesso; `past_due`,
`unpaid`, `paused` e `canceled` bloqueiam acesso.

O trial é configurado pela API na Checkout Session. Os Prices mensal e anual continuam
recorrentes e não precisam de configuração de trial no Stripe Dashboard.

## Pré-requisitos

Use somente chaves do Stripe Sandbox/Test mode:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_ANNUAL=price_...
WEB_APP_ORIGIN=http://localhost:3000
```

Confirme que ambos os Prices estão ativos, usam a moeda esperada e têm recorrência
`month` e `year`, respectivamente.

Aplique as migrações antes do teste:

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

No endpoint de produção, habilite estes eventos:

- `checkout.session.completed`
- `checkout.session.expired`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## Fluxo de sucesso

1. Crie conta com e-mail ainda não presente em `billing_trials`.
2. Abra `/app/billing`.
3. Confirme textos “Teste grátis por 7 dias”, “Cartão obrigatório” e cobrança automática.
4. Teste primeiro plano mensal e depois repita com outro e-mail no anual.
5. Use cartão `4242 4242 4242 4242`, validade futura e qualquer CVC.
6. Conclua Checkout.
7. Confirme redirecionamento, onboarding e acesso às rotas protegidas.
8. No Stripe Dashboard, confirme assinatura `trialing`, cartão salvo e `trial_end` em 7 dias.
9. No banco, confirme:

```sql
select user_id, email, checkout_session_id, interval, reserved_until, redeemed_at
from billing_trials
order by created_at desc;

select status, interval, trial_start, trial_end, current_period_start, current_period_end
from subscriptions
order by updated_at desc;
```

`redeemed_at` deve estar preenchido somente após Checkout concluído. `trial_start` e
`trial_end` devem refletir os timestamps retornados pela Stripe.

## Reuso, troca e expiração

1. Inicie Checkout e volte sem concluir.
2. Clique novamente no mesmo intervalo: a aplicação deve reutilizar a sessão aberta.
3. Troque mensal por anual: a sessão anterior deve ser expirada e substituída.
4. Expire a sessão pelo Stripe Dashboard ou CLI.
5. Confirme recebimento de `checkout.session.expired`.
6. Confirme que `checkout_session_id`, `interval` e `reserved_until` foram limpos e que o
   trial ainda está disponível.

## Trial único por e-mail

1. Conclua o primeiro Checkout.
2. Cancele a assinatura pelo Customer Portal.
3. Aguarde ou force sincronização até status local `canceled`.
4. Inicie novo Checkout usando a mesma conta.
5. Confirme que Checkout mostra cobrança imediata e a assinatura nova não possui trial.

Contas históricas com `pending_checkouts.status` igual a `confirmed` ou `completed` são
marcadas como trial já utilizado pela migração `0011_billing_trials.sql`.

## Fim do trial e primeira cobrança

No Stripe Dashboard em modo sandbox:

1. Abra a assinatura.
2. Use **Run simulation** na área de Billing para criar uma simulação/Test Clock.
3. Avance o relógio para depois de `trial_end`.
4. Confirme emissão da primeira invoice e transição da assinatura.

Com cartão de sucesso, resultado esperado:

- invoice paga;
- assinatura muda de `trialing` para `active`;
- webhook `customer.subscription.updated` atualiza estado local;
- acesso continua liberado.

## Falha da primeira cobrança

Para simular cartão salvo que falha em cobrança posterior, use
`4000 0000 0000 0341` no Sandbox. O método pode ser anexado, mas cobranças falham.

1. Conclua Checkout com trial.
2. Avance a simulação/Test Clock além de `trial_end`.
3. Confirme invoice não paga e assinatura `past_due`.
4. Confirme webhook `customer.subscription.updated`.
5. Consulte `GET /billing/subscription`: `entitled` deve ser `false`.
6. Confirme redirecionamento das rotas protegidas para `/app/billing`.
7. Atualize cartão pelo Customer Portal e pague a invoice.
8. Após Stripe retornar assinatura para `active`, confirme acesso restaurado.

A política de retries/cancelamento final continua configurada no Stripe Billing. Lucreii
bloqueia acesso assim que o status recebido deixa de ser `trialing` ou `active`.

## Diagnóstico

- Checkout não pede cartão: confirme `payment_method_collection=always`.
- Trial não aparece: confirme que `billing_trials.redeemed_at` está nulo para o e-mail.
- Novo trial indevido: confirme entrega de `checkout.session.completed` e execução da
  confirmação de Checkout no retorno da aplicação.
- UI não atualiza: consulte `GET /billing/subscription`; essa rota reconcilia assinatura com
  Stripe antes de retornar o snapshot.
- Webhook retorna 400: confirme corpo bruto e `STRIPE_WEBHOOK_SECRET` do listener atual.

## Referências

- [Stripe Checkout free trials](https://docs.stripe.com/payments/checkout/free-trials)
- [Stripe Billing simulations](https://docs.stripe.com/billing/testing/test-clocks/simulate-subscriptions)
- [Stripe webhook testing](https://docs.stripe.com/webhooks/test)
