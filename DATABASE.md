# PRD.md — Financial Engine v1 para Agente IA de Rentabilidade

## 1. Visão Geral

### Objetivo

Implementar um módulo financeiro para e-commerce capaz de registrar dados operacionais por SKU, por empresa e por mês, permitindo que o front-end calcule:

- Receita
- Lucro unitário
- Lucro total
- Margem de contribuição
- ROI
- ROAS mínimo
- ROAS real
- Faturamento
- Margem média
- Ponto de equilíbrio
- Lucro líquido

O sistema será usado por um agente de IA para diagnosticar rentabilidade, encontrar gargalos e gerar recomendações operacionais.

---

## 2. Decisões Arquiteturais

### 2.1 Banco de dados

Banco: **Supabase / PostgreSQL**

Padrões obrigatórios:

- Tabelas em inglês
- Colunas em inglês
- `snake_case`
- UUID como chave primária
- RLS habilitado em todas as tabelas
- Multiempresa por `company_id`
- Multiusuário por `user_id`
- Valores monetários com `numeric`, nunca `float`
- Percentuais armazenados como decimal entre `0` e `1`
- Datas mensais usando `reference_month`, sempre no primeiro dia do mês
- Colunas calculadas não serão persistidas no banco no v1
- Cálculos serão feitos no front-end

---

## 3. Escopo v1

### Incluído

- Cadastro de empresas/operações
- Registro mensal de performance por SKU
- Registro mensal de custos fixos
- RLS por usuário
- Constraints financeiras
- Índices para dashboard
- Fórmulas de cálculo no front-end
- Regras de negócio
- Regras de recomendação da IA
- Milestones e tasks

### Fora do escopo v1

- Integração automática com marketplace
- Importação automática de anúncios
- Forecast
- Multiusuário dentro da mesma empresa
- Roles avançadas
- Materialized views
- Triggers para cálculo financeiro
- Persistência de métricas calculadas

---

## 4. Glossário de Colunas

| Label PT-BR | Column EN | Tipo |
|---|---|---|
| CANAL | `channel` | text |
| PRODUTO | `product_name` | text |
| SKU | `sku` | text |
| VENDAS | `sales_quantity` | integer |
| DEVOLUÇÕES | `returns_quantity` | integer |
| VENDA LÍQUIDA | `net_sales_quantity` | computed front-end |
| CUSTO | `unit_cost` | numeric |
| PDV | `sale_price` | numeric |
| COMISSÃO | `commission_rate` | numeric |
| TAXA/FRETE | `shipping_fee` | numeric |
| ALÍQUOTA | `tax_rate` | numeric |
| EMBALAGEM | `packaging_cost` | numeric |
| PUBLICIDADE | `advertising_cost` | numeric |
| LUCRO UNITÁRIO | `unit_profit` | computed front-end |
| MARGEM CONTRIBUIÇÃO | `contribution_margin` | computed front-end |
| ROI | `roi` | computed front-end |
| ROAS MÍNIMO | `minimum_roas` | computed front-end |
| RECEITA | `revenue` | computed front-end |
| COMISSÃO MELI | `marketplace_commission_total` | computed front-end |
| TOTAL TAXA/FRETE | `shipping_total` | computed front-end |
| IMPOSTO | `tax_total` | computed front-end |
| TOTAL EMBALAGEM | `packaging_total` | computed front-end |
| CUSTO PRODUTO TOTAL | `product_cost_total` | computed front-end |
| LUCRO TOTAL | `total_profit` | computed front-end |
| ROAS REAL | `actual_roas` | computed front-end |

---

## 5. Indicadores do Dashboard

| Label PT-BR | Key EN | Fonte |
|---|---|---|
| FATURAMENTO | `gross_revenue` | computed front-end |
| MARGEM MÉDIA | `average_margin` | computed front-end |
| PONTO DE EQUILÍBRIO | `break_even_point` | computed front-end |
| LUCRO LÍQUIDO | `net_profit` | computed front-end |

---

## 6. Modelo de Dados Supabase

### 6.1 Tabela: `companies`

Representa uma operação/empresa do usuário.

Exemplo:

- Name: `Mercado Livre`
- Code: `MELI`

```sql
create table public.companies (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,

  name text not null,
  code text not null,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint companies_name_length check (char_length(trim(name)) >= 2),
  constraint companies_code_length check (char_length(trim(code)) between 2 and 12),
  constraint companies_code_uppercase check (code = upper(code))
);
```

#### Índices

```sql
create index companies_user_id_idx
on public.companies (user_id);

create unique index companies_user_id_code_unique_idx
on public.companies (user_id, code);

create index companies_user_id_is_active_idx
on public.companies (user_id, is_active);
```

#### Regras

- Cada usuário só acessa suas próprias empresas.
- `code` deve ser único por usuário.
- `code` deve ser uppercase.
- Não deletar empresa via UI preferencialmente; usar `is_active = false`.

---

### 6.2 Tabela: `product_monthly_performance`

Tabela principal. Cada linha representa o desempenho de um SKU em uma empresa, canal e mês.

```sql
create table public.product_monthly_performance (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,

  reference_month date not null,

  channel text not null,
  product_name text not null,
  sku text not null,

  sales_quantity integer not null default 0,
  returns_quantity integer not null default 0,

  unit_cost numeric(12, 2) not null default 0,
  sale_price numeric(12, 2) not null,

  commission_rate numeric(8, 6) not null default 0,
  shipping_fee numeric(12, 2) not null default 0,
  tax_rate numeric(8, 6) not null default 0,
  packaging_cost numeric(12, 2) not null default 0,

  advertising_cost numeric(12, 2) not null default 0,

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint product_monthly_performance_reference_month_first_day
    check (reference_month = date_trunc('month', reference_month)::date),

  constraint product_monthly_performance_channel_not_empty
    check (char_length(trim(channel)) >= 2),

  constraint product_monthly_performance_product_name_not_empty
    check (char_length(trim(product_name)) >= 2),

  constraint product_monthly_performance_sku_not_empty
    check (char_length(trim(sku)) >= 1),

  constraint product_monthly_performance_sales_non_negative
    check (sales_quantity >= 0),

  constraint product_monthly_performance_returns_non_negative
    check (returns_quantity >= 0),

  constraint product_monthly_performance_returns_lte_sales
    check (returns_quantity <= sales_quantity),

  constraint product_monthly_performance_unit_cost_non_negative
    check (unit_cost >= 0),

  constraint product_monthly_performance_sale_price_positive
    check (sale_price > 0),

  constraint product_monthly_performance_commission_rate_range
    check (commission_rate >= 0 and commission_rate <= 1),

  constraint product_monthly_performance_shipping_fee_non_negative
    check (shipping_fee >= 0),

  constraint product_monthly_performance_tax_rate_range
    check (tax_rate >= 0 and tax_rate <= 1),

  constraint product_monthly_performance_packaging_cost_non_negative
    check (packaging_cost >= 0),

  constraint product_monthly_performance_advertising_cost_non_negative
    check (advertising_cost >= 0)
);
```

#### Índices

```sql
create index product_monthly_performance_user_id_idx
on public.product_monthly_performance (user_id);

create index product_monthly_performance_company_month_idx
on public.product_monthly_performance (company_id, reference_month);

create index product_monthly_performance_user_month_idx
on public.product_monthly_performance (user_id, reference_month);

create index product_monthly_performance_channel_month_idx
on public.product_monthly_performance (channel, reference_month);

create index product_monthly_performance_sku_idx
on public.product_monthly_performance (sku);

create unique index product_monthly_performance_unique_sku_month_company_channel_idx
on public.product_monthly_performance (
  user_id,
  company_id,
  reference_month,
  channel,
  sku
);
```

#### Regras

- O mesmo SKU pode existir em empresas diferentes.
- O mesmo SKU pode existir em canais diferentes.
- O mesmo SKU não pode duplicar no mesmo mês, empresa e canal.
- `reference_month` deve ser sempre o primeiro dia do mês.
- Percentuais devem ser armazenados como decimal:
  - 14% = `0.14`
  - 4% = `0.04`

---

### 6.3 Tabela: `fixed_costs`

Custos fixos mensais da empresa.

Usado para cálculo de:

- `net_profit`
- `break_even_point`

```sql
create table public.fixed_costs (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,

  reference_month date not null,

  name text not null,
  category text not null default 'general',

  amount numeric(12, 2) not null,

  is_recurring boolean not null default true,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint fixed_costs_reference_month_first_day
    check (reference_month = date_trunc('month', reference_month)::date),

  constraint fixed_costs_name_not_empty
    check (char_length(trim(name)) >= 2),

  constraint fixed_costs_category_not_empty
    check (char_length(trim(category)) >= 2),

  constraint fixed_costs_amount_non_negative
    check (amount >= 0)
);
```

#### Índices

```sql
create index fixed_costs_user_id_idx
on public.fixed_costs (user_id);

create index fixed_costs_company_month_idx
on public.fixed_costs (company_id, reference_month);

create index fixed_costs_user_month_idx
on public.fixed_costs (user_id, reference_month);

create index fixed_costs_category_idx
on public.fixed_costs (category);
```

---

## 7. Triggers de `updated_at`

```sql
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_companies_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

create trigger set_product_monthly_performance_updated_at
before update on public.product_monthly_performance
for each row execute function public.set_updated_at();

create trigger set_fixed_costs_updated_at
before update on public.fixed_costs
for each row execute function public.set_updated_at();
```

---

## 8. RLS — Row Level Security

### 8.1 Habilitar RLS

```sql
alter table public.companies enable row level security;
alter table public.product_monthly_performance enable row level security;
alter table public.fixed_costs enable row level security;
```

---

### 8.2 Policies: `companies`

```sql
create policy "Users can view own companies"
on public.companies
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own companies"
on public.companies
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own companies"
on public.companies
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own companies"
on public.companies
for delete
to authenticated
using (auth.uid() = user_id);
```

---

### 8.3 Policies: `product_monthly_performance`

```sql
create policy "Users can view own product performance"
on public.product_monthly_performance
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own product performance"
on public.product_monthly_performance
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.companies c
    where c.id = company_id
      and c.user_id = auth.uid()
  )
);

create policy "Users can update own product performance"
on public.product_monthly_performance
for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.companies c
    where c.id = company_id
      and c.user_id = auth.uid()
  )
);

create policy "Users can delete own product performance"
on public.product_monthly_performance
for delete
to authenticated
using (auth.uid() = user_id);
```

---

### 8.4 Policies: `fixed_costs`

```sql
create policy "Users can view own fixed costs"
on public.fixed_costs
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own fixed costs"
on public.fixed_costs
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.companies c
    where c.id = company_id
      and c.user_id = auth.uid()
  )
);

create policy "Users can update own fixed costs"
on public.fixed_costs
for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.companies c
    where c.id = company_id
      and c.user_id = auth.uid()
  )
);

create policy "Users can delete own fixed costs"
on public.fixed_costs
for delete
to authenticated
using (auth.uid() = user_id);
```

---

## 9. Observação Importante de Segurança

As policies usam `user_id` como isolamento principal.

O front-end sempre deve preencher:

```ts
user_id = auth.user.id
```

Entretanto, para maior segurança, recomenda-se futuramente criar funções RPC `security definer` para inserts/updates e remover `user_id` do payload do cliente.

No v1, as policies já impedem que um usuário grave dados em empresas de outro usuário.

---

## 10. Tipos TypeScript

### 10.1 Company

```ts
export type Company = {
  id: string
  user_id: string
  name: string
  code: string
  is_active: boolean
  created_at: string
  updated_at: string
}
```

---

### 10.2 ProductMonthlyPerformanceInput

```ts
export type ProductMonthlyPerformanceInput = {
  company_id: string
  reference_month: string

  channel: string
  product_name: string
  sku: string

  sales_quantity: number
  returns_quantity: number

  unit_cost: number
  sale_price: number

  commission_rate: number
  shipping_fee: number
  tax_rate: number
  packaging_cost: number

  advertising_cost: number

  notes?: string | null
}
```

---

### 10.3 ProductMonthlyPerformanceRow

```ts
export type ProductMonthlyPerformanceRow = ProductMonthlyPerformanceInput & {
  id: string
  user_id: string
  created_at: string
  updated_at: string
}
```

---

### 10.4 FixedCostInput

```ts
export type FixedCostInput = {
  company_id: string
  reference_month: string
  name: string
  category: string
  amount: number
  is_recurring: boolean
  notes?: string | null
}
```

---

### 10.5 FixedCostRow

```ts
export type FixedCostRow = FixedCostInput & {
  id: string
  user_id: string
  created_at: string
  updated_at: string
}
```

---

## 11. Fórmulas do Front-end

Todas as fórmulas abaixo são calculadas no front-end.

### 11.1 Net Sales Quantity

```ts
net_sales_quantity =
sales_quantity - returns_quantity
```

Fail-safe:

```ts
net_sales_quantity = Math.max(0, sales_quantity - returns_quantity)
```

---

### 11.2 Revenue

```ts
revenue =
net_sales_quantity * sale_price
```

---

### 11.3 Marketplace Commission Total

```ts
marketplace_commission_total =
revenue * commission_rate
```

---

### 11.4 Shipping Total

```ts
shipping_total =
shipping_fee * net_sales_quantity
```

---

### 11.5 Tax Total

```ts
tax_total =
revenue * tax_rate
```

---

### 11.6 Packaging Total

```ts
packaging_total =
packaging_cost * net_sales_quantity
```

---

### 11.7 Product Cost Total

```ts
product_cost_total =
unit_cost * net_sales_quantity
```

---

### 11.8 Advertising Unit Cost

```ts
advertising_unit_cost =
advertising_cost / Math.max(net_sales_quantity, 1)
```

---

### 11.9 Unit Profit

```ts
unit_profit =
sale_price
- unit_cost
- (marketplace_commission_total / Math.max(net_sales_quantity, 1))
- shipping_fee
- (tax_total / Math.max(net_sales_quantity, 1))
- packaging_cost
- advertising_unit_cost
```

Forma simplificada:

```ts
unit_profit =
sale_price
- unit_cost
- (sale_price * commission_rate)
- shipping_fee
- (sale_price * tax_rate)
- packaging_cost
- (advertising_cost / Math.max(net_sales_quantity, 1))
```

---

### 11.10 Total Profit

```ts
total_profit =
unit_profit * net_sales_quantity
```

Forma equivalente:

```ts
total_profit =
revenue
- marketplace_commission_total
- shipping_total
- tax_total
- packaging_total
- product_cost_total
- advertising_cost
```

---

### 11.11 Contribution Margin

```ts
contribution_margin =
unit_profit / sale_price
```

Fail-safe:

```ts
if sale_price <= 0:
  contribution_margin = 0
```

---

### 11.12 ROI

```ts
roi =
total_profit / advertising_cost
```

Fail-safe:

```ts
if advertising_cost <= 0:
  roi = 0
```

---

### 11.13 Actual ROAS

```ts
actual_roas =
revenue / advertising_cost
```

Fail-safe:

```ts
if advertising_cost <= 0:
  actual_roas = 0
```

---

### 11.14 Minimum ROAS

```ts
minimum_roas =
1 / contribution_margin
```

Fail-safe:

```ts
if contribution_margin <= 0:
  minimum_roas = Infinity
```

---

## 12. Fórmulas do Dashboard

### 12.1 Gross Revenue

```ts
gross_revenue =
sum(rows.map(row => row.revenue))
```

---

### 12.2 Average Margin

Margem média deve ser ponderada por receita.

Não usar média simples.

```ts
average_margin =
sum(rows.map(row => row.contribution_margin * row.revenue))
/
sum(rows.map(row => row.revenue))
```

Fail-safe:

```ts
if gross_revenue <= 0:
  average_margin = 0
```

---

### 12.3 Fixed Costs Total

```ts
fixed_costs_total =
sum(fixed_costs.map(cost => cost.amount))
```

---

### 12.4 Net Profit

```ts
net_profit =
sum(rows.map(row => row.total_profit))
- fixed_costs_total
```

---

### 12.5 Break Even Point

```ts
break_even_point =
fixed_costs_total / average_margin
```

Fail-safe:

```ts
if average_margin <= 0:
  break_even_point = Infinity
```

---

## 13. Regras de Negócio por Coluna

### 13.1 `channel`

Representa o canal de venda.

Exemplos:

- `mercado_livre`
- `amazon`
- `shopee`
- `site`
- `whatsapp`

Regra:

- obrigatório
- mínimo de 2 caracteres
- usado para agrupamento e filtros

---

### 13.2 `product_name`

Nome comercial do produto.

Regra:

- obrigatório
- mínimo de 2 caracteres

---

### 13.3 `sku`

Identificador operacional do produto.

Regra:

- obrigatório
- único por usuário, empresa, canal e mês

---

### 13.4 `sales_quantity`

Quantidade bruta vendida.

Regra:

- inteiro
- maior ou igual a zero

---

### 13.5 `returns_quantity`

Quantidade devolvida/cancelada.

Regra:

- inteiro
- maior ou igual a zero
- menor ou igual a `sales_quantity`

---

### 13.6 `unit_cost`

Custo unitário do produto.

Inclui:

- compra
- fabricação

Não inclui:

- comissão
- frete
- imposto
- embalagem
- publicidade

---

### 13.7 `sale_price`

Preço de venda unitário.

Regra:

- obrigatório
- maior que zero

---

### 13.8 `commission_rate`

Percentual de comissão do marketplace.

Regra:

- decimal entre 0 e 1
- 14% deve ser salvo como `0.14`

---

### 13.9 `shipping_fee`

Custo unitário de taxa/frete.

Regra:

- monetário
- maior ou igual a zero

---

### 13.10 `tax_rate`

Percentual de imposto.

Regra:

- decimal entre 0 e 1
- 4% deve ser salvo como `0.04`

---

### 13.11 `packaging_cost`

Custo unitário de embalagem.

Regra:

- monetário
- maior ou igual a zero

---

### 13.12 `advertising_cost`

Gasto total de publicidade do SKU no mês.

Regra:

- monetário
- maior ou igual a zero
- não é unitário

---

## 14. Regras de Diagnóstico

### 14.1 Produto em prejuízo

```ts
if unit_profit < 0
```

Status:

```ts
"LOSS"
```

Recomendação:

- pausar anúncio
- revisar preço
- reduzir frete
- reduzir comissão/canal
- revisar custo do produto

---

### 14.2 Margem crítica

```ts
if contribution_margin >= 0 && contribution_margin < 0.10
```

Status:

```ts
"CRITICAL_MARGIN"
```

Recomendação:

- aumentar preço
- reduzir custo
- revisar frete
- reduzir publicidade

---

### 14.3 Margem fraca

```ts
if contribution_margin >= 0.10 && contribution_margin < 0.20
```

Status:

```ts
"WEAK_MARGIN"
```

Recomendação:

- monitorar
- não escalar agressivamente
- buscar melhoria de custo

---

### 14.4 Margem boa

```ts
if contribution_margin >= 0.20 && contribution_margin < 0.30
```

Status:

```ts
"GOOD_MARGIN"
```

Recomendação:

- manter
- testar aumento moderado de mídia

---

### 14.5 Margem excelente

```ts
if contribution_margin >= 0.30
```

Status:

```ts
"EXCELLENT_MARGIN"
```

Recomendação:

- priorizar produto
- aumentar estoque
- testar escala de anúncios

---

### 14.6 ROI ruim

```ts
if advertising_cost > 0 && roi < 1
```

Status:

```ts
"BAD_ROI"
```

Recomendação:

- revisar campanha
- reduzir orçamento
- melhorar criativo/listing

---

### 14.7 Produto escalável

```ts
if contribution_margin >= 0.30
and roi >= 3
and total_profit > 0
```

Status:

```ts
"SCALABLE"
```

Recomendação:

- escalar verba com cautela
- monitorar ROAS real
- garantir estoque

---

### 14.8 Ads em prejuízo

```ts
if advertising_cost > 0
and actual_roas < minimum_roas
```

Status:

```ts
"ADS_LOSS"
```

Recomendação:

- reduzir ou pausar ads
- melhorar conversão
- subir preço
- reduzir custo

---

### 14.9 Frete crítico

```ts
if shipping_fee > sale_price * 0.25
```

Status:

```ts
"CRITICAL_SHIPPING"
```

Recomendação:

- revisar modalidade logística
- criar kit
- aumentar ticket médio
- negociar frete

---

### 14.10 Empresa abaixo do ponto de equilíbrio

```ts
if gross_revenue < break_even_point
```

Status:

```ts
"BELOW_BREAK_EVEN"
```

Recomendação:

- aumentar faturamento
- cortar fixos
- priorizar produtos com melhor margem
- pausar produtos deficitários

---

## 15. Recommendation Engine

### 15.1 Input esperado

```ts
type RecommendationInput = {
  company: Company
  reference_month: string
  rows: ProductMonthlyPerformanceWithComputed[]
  fixed_costs: FixedCostRow[]
  dashboard: DashboardMetrics
}
```

---

### 15.2 Output esperado

```ts
type RecommendationOutput = {
  health_score: number
  alerts: RecommendationAlert[]
  recommendations: RecommendationItem[]
  executive_summary: string
}
```

---

### 15.3 Alert

```ts
type RecommendationAlert = {
  severity: "low" | "medium" | "high" | "critical"
  code:
    | "LOSS"
    | "CRITICAL_MARGIN"
    | "BAD_ROI"
    | "ADS_LOSS"
    | "CRITICAL_SHIPPING"
    | "BELOW_BREAK_EVEN"
  title: string
  description: string
  sku?: string
}
```

---

### 15.4 Recommendation Item

```ts
type RecommendationItem = {
  priority: "low" | "medium" | "high"
  action:
    | "pause_ads"
    | "increase_price"
    | "reduce_cost"
    | "reduce_shipping"
    | "scale_ads"
    | "increase_stock"
    | "cut_fixed_costs"
  reason: string
  expected_impact: string
  sku?: string
}
```

---

## 16. Milestones e Tasks

# Milestone 1 — Database Foundation

Objetivo: criar base Supabase segura, escalável e multiempresa.

## Tasks

### Task 1.1 — Criar tabela `companies`

Critérios de aceite:

- tabela criada
- `id` UUID
- `user_id` obrigatório
- `name` obrigatório
- `code` obrigatório e uppercase
- unique index em `(user_id, code)`
- RLS habilitado

---

### Task 1.2 — Criar tabela `product_monthly_performance`

Critérios de aceite:

- tabela criada
- multiempresa via `company_id`
- isolamento por `user_id`
- `reference_month` obrigatório
- constraints financeiras aplicadas
- unique index por SKU/mês/empresa/canal
- sem colunas calculadas persistidas

---

### Task 1.3 — Criar tabela `fixed_costs`

Critérios de aceite:

- tabela criada
- vinculada a `company_id`
- vinculada a `reference_month`
- `amount >= 0`
- RLS habilitado

---

### Task 1.4 — Criar função `set_updated_at`

Critérios de aceite:

- função criada
- triggers aplicadas nas 3 tabelas
- `updated_at` atualizado automaticamente

---

# Milestone 2 — Security / RLS

Objetivo: impedir vazamento de dados entre usuários.

## Tasks

### Task 2.1 — Habilitar RLS

Critérios de aceite:

- RLS ativo em `companies`
- RLS ativo em `product_monthly_performance`
- RLS ativo em `fixed_costs`

---

### Task 2.2 — Criar policies de leitura

Critérios de aceite:

- usuário só vê registros com `user_id = auth.uid()`

---

### Task 2.3 — Criar policies de insert

Critérios de aceite:

- usuário só insere registros com `user_id = auth.uid()`
- `company_id` deve pertencer ao usuário autenticado

---

### Task 2.4 — Criar policies de update

Critérios de aceite:

- usuário só atualiza seus próprios registros
- não é possível mover registro para empresa de outro usuário

---

### Task 2.5 — Criar policies de delete

Critérios de aceite:

- usuário só deleta seus próprios registros

---

# Milestone 3 — Front-end Calculation Engine

Objetivo: implementar todas as fórmulas no front-end.

## Tasks

### Task 3.1 — Implementar função `calculateProductRow`

Input:

```ts
ProductMonthlyPerformanceRow
```

Output:

```ts
ProductMonthlyPerformanceWithComputed
```

Deve calcular:

- `net_sales_quantity`
- `revenue`
- `marketplace_commission_total`
- `shipping_total`
- `tax_total`
- `packaging_total`
- `product_cost_total`
- `unit_profit`
- `contribution_margin`
- `roi`
- `minimum_roas`
- `total_profit`
- `actual_roas`

---

### Task 3.2 — Implementar fail-safes

Critérios de aceite:

- não gerar `NaN`
- não gerar erro por divisão por zero
- usar `Infinity` apenas para `minimum_roas` e `break_even_point` quando aplicável

---

### Task 3.3 — Implementar função `calculateDashboardMetrics`

Input:

```ts
rows: ProductMonthlyPerformanceWithComputed[]
fixedCosts: FixedCostRow[]
```

Output:

```ts
DashboardMetrics
```

Deve calcular:

- `gross_revenue`
- `average_margin`
- `fixed_costs_total`
- `net_profit`
- `break_even_point`

---

# Milestone 4 — Dashboard

Objetivo: exibir indicadores executivos.

## Tasks

### Task 4.1 — Card de faturamento

Exibir:

- label: `Faturamento`
- key: `gross_revenue`
- formato BRL

---

### Task 4.2 — Card de margem média

Exibir:

- label: `Margem Média`
- key: `average_margin`
- formato percentual

---

### Task 4.3 — Card de ponto de equilíbrio

Exibir:

- label: `Ponto de Equilíbrio`
- key: `break_even_point`
- formato BRL

---

### Task 4.4 — Card de lucro líquido

Exibir:

- label: `Lucro Líquido`
- key: `net_profit`
- formato BRL

---

# Milestone 5 — Product Table

Objetivo: tabela operacional por SKU.

## Tasks

### Task 5.1 — Criar grid de inputs

Campos editáveis:

- `channel`
- `product_name`
- `sku`
- `sales_quantity`
- `returns_quantity`
- `unit_cost`
- `sale_price`
- `commission_rate`
- `shipping_fee`
- `tax_rate`
- `packaging_cost`
- `advertising_cost`

---

### Task 5.2 — Criar colunas calculadas no front-end

Campos calculados:

- `net_sales_quantity`
- `unit_profit`
- `contribution_margin`
- `roi`
- `minimum_roas`
- `revenue`
- `marketplace_commission_total`
- `shipping_total`
- `tax_total`
- `packaging_total`
- `product_cost_total`
- `total_profit`
- `actual_roas`

---

### Task 5.3 — Formatação

Critérios de aceite:

- moeda em BRL
- percentuais com duas casas
- quantidades como inteiro
- valores negativos destacados

---

# Milestone 6 — Fixed Costs

Objetivo: permitir cálculo de lucro líquido e break-even.

## Tasks

### Task 6.1 — Criar CRUD de custos fixos

Campos:

- `name`
- `category`
- `amount`
- `is_recurring`
- `notes`

---

### Task 6.2 — Filtrar custos fixos por empresa e mês

Critérios de aceite:

- usuário escolhe empresa
- usuário escolhe mês
- dashboard usa apenas custos daquele mês e empresa

---

# Milestone 7 — Business Rules Engine

Objetivo: gerar diagnósticos automáticos.

## Tasks

### Task 7.1 — Implementar status por SKU

Status possíveis:

- `LOSS`
- `CRITICAL_MARGIN`
- `WEAK_MARGIN`
- `GOOD_MARGIN`
- `EXCELLENT_MARGIN`
- `BAD_ROI`
- `SCALABLE`
- `ADS_LOSS`
- `CRITICAL_SHIPPING`

---

### Task 7.2 — Implementar status da empresa

Status possíveis:

- `HEALTHY`
- `BELOW_BREAK_EVEN`
- `NEGATIVE_NET_PROFIT`

---

# Milestone 8 — AI Recommendation Layer

Objetivo: entregar recomendações para o agente IA.

## Tasks

### Task 8.1 — Gerar payload normalizado

O front-end deve enviar ao agente:

```ts
{
  company,
  reference_month,
  rows_with_computed_metrics,
  fixed_costs,
  dashboard_metrics
}
```

---

### Task 8.2 — Gerar recomendações por SKU

Critérios:

- prejuízo
- margem crítica
- ROI ruim
- ROAS abaixo do mínimo
- frete crítico
- escalabilidade

---

### Task 8.3 — Gerar resumo executivo

O agente deve responder:

- situação geral
- principais riscos
- produtos prioritários
- ações recomendadas
- impacto esperado

---

## 17. DTOs Computados do Front-end

```ts
export type ProductMonthlyPerformanceComputed = {
  net_sales_quantity: number

  revenue: number

  marketplace_commission_total: number
  shipping_total: number
  tax_total: number
  packaging_total: number
  product_cost_total: number

  advertising_unit_cost: number

  unit_profit: number
  total_profit: number

  contribution_margin: number

  roi: number
  minimum_roas: number
  actual_roas: number
}
```

---

```ts
export type ProductMonthlyPerformanceWithComputed =
  ProductMonthlyPerformanceRow &
  ProductMonthlyPerformanceComputed & {
    status_codes: string[]
  }
```

---

```ts
export type DashboardMetrics = {
  gross_revenue: number
  average_margin: number
  fixed_costs_total: number
  net_profit: number
  break_even_point: number
}
```

---

## 18. Boas Práticas Supabase

### 18.1 Não usar float para dinheiro

Errado:

```sql
amount float
```

Certo:

```sql
amount numeric(12, 2)
```

---

### 18.2 Não salvar percentuais como 14

Errado:

```text
14
```

Certo:

```text
0.14
```

---

### 18.3 Não confiar somente no front-end

O banco deve validar:

- valores negativos
- percentuais fora de faixa
- devoluções maiores que vendas
- referência mensal inválida

---

### 18.4 Não persistir métricas calculadas no v1

Evitar inconsistência entre:

- input salvo
- cálculo salvo
- cálculo exibido

No v1, todas as métricas calculadas ficam no front-end.

---

### 18.5 Usar `reference_month`

Não criar colunas como:

- `month`
- `year`
- `abril`
- `maio`

Certo:

```sql
reference_month date not null
```

Exemplo:

```text
2026-05-01
```

---

## 19. Ordem Recomendada de Implementação

1. Criar migrations SQL
2. Criar RLS policies
3. Testar isolamento entre usuários
4. Criar types no front-end
5. Criar CRUD de empresas
6. Criar CRUD de performance por SKU
7. Criar CRUD de custos fixos
8. Criar engine de cálculo no front-end
9. Criar dashboard
10. Criar regras de diagnóstico
11. Criar payload para agente IA
12. Criar camada de recomendações

---

## 20. Checklist Final de Aceite

- [ ] Tabelas criadas no Supabase
- [ ] RLS habilitado em todas as tabelas
- [ ] Policies criadas
- [ ] Usuário A não acessa dados do usuário B
- [ ] Empresas possuem `name` e `code`
- [ ] SKU não duplica no mesmo mês/canal/empresa
- [ ] Percentuais salvos entre 0 e 1
- [ ] Valores monetários com `numeric`
- [ ] `reference_month` sempre primeiro dia do mês
- [ ] Custos fixos modelados
- [ ] Cálculos implementados no front-end
- [ ] Dashboard mostra os 4 indicadores
- [ ] Agente IA recebe payload computado
- [ ] Regras de recomendação implementadas

---

## 21. Resultado Esperado

Ao final da v1, o sistema deve permitir que o usuário selecione:

- empresa
- mês
- canal
- SKU

E visualize:

- lucro por produto
- margem por produto
- ROI por produto
- ROAS real vs ROAS mínimo
- faturamento total
- margem média
- ponto de equilíbrio
- lucro líquido

O agente de IA deverá usar esses dados para responder como um consultor financeiro de e-commerce, recomendando ações práticas para melhorar lucro e reduzir risco.
