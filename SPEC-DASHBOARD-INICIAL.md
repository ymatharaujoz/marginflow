# SPEC.md — Refatoração da Página Principal do Dashboard

## 1. Contexto

A plataforma já possui uma página principal onde o usuário entra para visualizar dashboards, indicadores, listas de produtos e dados gerais da operação.

Este documento especifica a refatoração completa dessa página principal, com foco em experiência SaaS premium, clareza operacional e análise financeira orientada a sellers de marketplaces como Mercado Livre, Shopee e Amazon.

A refatoração deve transformar a página principal em um cockpit financeiro e operacional, mantendo o escopo restrito à tela inicial/dashboard principal da plataforma.

---

## 2. Objetivo

Refatorar a página principal do dashboard para que o usuário consiga entender rapidamente:

- Quanto está faturando
- Quanto está lucrando
- Quais produtos são mais lucrativos
- Quais produtos estão em situação crítica
- Como os Ads impactam o resultado
- Qual marketplace performa melhor
- Quais indicadores merecem atenção
- Onde existem gargalos de margem, ROI, ROAS e devoluções

A página deve parecer moderna, premium, limpa, rápida e confiável.

---

## 3. Escopo

### Incluído

- Refatoração visual da página principal
- Novo layout de dashboard
- Cards de indicadores financeiros
- Gráficos principais
- Insights automáticos
- Lista/tabela de produtos
- Estados visuais de saúde financeira
- Filtros globais
- Estrutura modular de componentes
- Organização de tipos, hooks e cálculos
- Responsividade
- Empty states
- Loading states
- Error states

### Fora do escopo nesta etapa

- Criação de páginas novas
- CRUD completo de produtos
- Fluxo de caixa detalhado em página separada
- Importação de planilhas
- Exportação XLSX avançada
- IA generativa real
- Integrações externas novas
- Autenticação
- Billing
- Área administrativa

---

## 4. Stack Esperada

- Next.js
- TypeScript
- TailwindCSS
- shadcn/ui
- Framer Motion
- Lucide React
- Recharts
- TanStack Table
- TanStack Query, se já estiver presente no projeto
- Zustand ou store existente, se já estiver presente

Não introduzir bibliotecas novas sem necessidade clara.

---

## 5. Diretrizes Visuais

### Estilo

- White theme premium
- Fundo branco ou off-white
- Cards limpos
- Bordas suaves
- Sombras sutis
- Tipografia moderna
- Espaçamento generoso
- Alta escaneabilidade
- Microinterações discretas
- Visual inspirado em Vercel, Linear, Stripe e Raycast, sem copiar layouts

### Sensação desejada

A página deve transmitir:

- clareza
- precisão
- inteligência
- controle
- sofisticação
- velocidade

---

## 6. Estrutura Alvo da Página

```txt
Dashboard Principal
├── Header inteligente
├── Filtros globais
├── Cards de KPIs
├── Insights inteligentes
├── Gráficos principais
├── Produtos em destaque
├── Tabela/lista principal de produtos
├── Alertas financeiros
└── Resumo operacional
```

---

## 7. Indicadores Principais

A página deve exibir cards para:

- Faturamento
- Lucro bruto
- Lucro líquido
- Margem média
- ROI médio
- ROAS médio
- Investimento em Ads
- Produtos críticos
- Marketplace mais lucrativo
- Produto mais lucrativo

Cada card deve conter:

- Título
- Valor principal
- Variação percentual, se disponível
- Ícone
- Tooltip explicativo, se possível
- Estado visual positivo, neutro ou crítico

---

## 8. Tabela/Listagem de Produtos

A tabela de produtos é o núcleo operacional da página.

### Colunas recomendadas

| Grupo | Campos |
|---|---|
| Produto | Nome, SKU, Marketplace |
| Operação | Vendas, Devoluções, Venda líquida |
| Receita | Receita, Ticket médio |
| Custos | Comissão, Frete, Imposto, Custo |
| Ads | Investimento, ROAS |
| Resultado | Lucro, Margem, ROI |
| Status | Saúde financeira |

### Estados de status

| Condição | Status |
|---|---|
| Lucro negativo | Crítico |
| Margem baixa | Atenção |
| ROAS abaixo do mínimo | Atenção |
| ROI alto | Saudável |
| Alta devolução | Atenção |
| Produto sem venda | Neutro |
| Produto com lucro e margem bons | Escalável |

### Recursos esperados

- Busca por produto
- Filtro por marketplace
- Filtro por status
- Ordenação por lucro
- Ordenação por faturamento
- Ordenação por margem
- Ordenação por ROI
- Badges visuais
- Empty state
- Skeleton/loading state
- Responsividade

---

## 9. Fórmulas e Regras

As regras devem ser centralizadas em funções puras sempre que possível.

### Venda líquida

```ts
netSales = sales - returns
```

### Receita

```ts
revenue = salePrice * netSales
```

### Lucro bruto por produto

```ts
grossProfit =
  revenue
  - marketplaceCommission
  - shippingCost
  - taxAmount
  - packagingCost
  - productCost
```

### Margem

```ts
margin = revenue > 0 ? grossProfit / revenue : 0
```

### ROI

```ts
roi = productCost > 0 ? grossProfit / productCost : null
```

### ROAS

```ts
roas = adSpend > 0 ? revenue / adSpend : null
```

### Regras de proteção

- Nunca dividir por zero
- Valores inexistentes devem renderizar como `—`
- Percentuais devem ser formatados com consistência
- Valores monetários devem ser formatados em BRL
- Dados negativos devem ter tratamento visual claro

---

## 10. Arquitetura Recomendada

Criar ou reorganizar a estrutura da página de forma modular.

```txt
/modules/dashboard
├── components
│   ├── dashboard-header.tsx
│   ├── dashboard-filters.tsx
│   ├── kpi-card.tsx
│   ├── kpi-grid.tsx
│   ├── insights-panel.tsx
│   ├── products-table.tsx
│   ├── featured-products.tsx
│   ├── financial-alerts.tsx
│   └── operational-summary.tsx
├── charts
│   ├── revenue-profit-chart.tsx
│   ├── marketplace-performance-chart.tsx
│   └── margin-by-product-chart.tsx
├── hooks
│   ├── use-dashboard-data.ts
│   ├── use-dashboard-filters.ts
│   └── use-product-table.ts
├── services
│   └── dashboard-service.ts
├── calculations
│   ├── financial-calculations.ts
│   └── product-health.ts
├── types
│   └── dashboard.types.ts
└── utils
    └── formatters.ts
```

Adaptar essa estrutura ao padrão real do projeto se ele já possuir outra organização.

---

## 11. Tipos Base

```ts
export type Marketplace = 'MERCADO_LIVRE' | 'SHOPEE' | 'AMAZON' | 'OTHER'

export type ProductHealthStatus =
  | 'critical'
  | 'attention'
  | 'neutral'
  | 'healthy'
  | 'scalable'

export type DashboardProduct = {
  id: string
  name: string
  sku?: string
  marketplace: Marketplace

  sales: number
  returns: number
  netSales: number

  salePrice: number
  revenue: number
  averageTicket?: number

  marketplaceCommission: number
  shippingCost: number
  taxAmount: number
  packagingCost?: number
  productCost: number

  adSpend: number
  roas: number | null

  grossProfit: number
  netProfit?: number
  margin: number
  roi: number | null

  healthStatus: ProductHealthStatus
}

export type DashboardKpis = {
  revenue: number
  grossProfit: number
  netProfit: number
  averageMargin: number
  averageRoi: number | null
  averageRoas: number | null
  adSpend: number
  criticalProducts: number
  bestMarketplace?: Marketplace
  bestProduct?: DashboardProduct
}

export type DashboardFilters = {
  marketplace: Marketplace[]
  search: string
  status?: ProductHealthStatus
  period?: string
}
```

---

## 12. Milestones

## Milestone 1 ??? Auditoria da P??gina Atual
### Objetivo
Entender a estrutura atual antes de refatorar.
### Tasks
- [x] Localizar o arquivo/rota da p??gina principal atual
- [x] Mapear componentes usados atualmente
- [x] Mapear origem dos dados
- [x] Identificar hooks, services e stores existentes
- [x] Identificar c??lculos financeiros j?? existentes
- [x] Identificar componentes que podem ser reaproveitados
- [x] Identificar componentes que devem ser substitu??dos
- [x] Garantir que a refatora????o n??o quebre navega????o existente
### Crit??rios de aceite
- [x] A rota principal continua funcionando
- [x] Foi identificado o fluxo de dados atual
- [x] Foi identificado onde a nova estrutura ser?? aplicada
### Notas da auditoria
- Rota ativa confirmada em apps/web/src/app/(app)/app/page.tsx, preservando redirects de auth e billing.
- Fluxo atual confirmado: DashboardHome cliente consulta /dashboard/summary, /dashboard/charts, /dashboard/recent-sync e /dashboard/profitability.
- Itens reaproveitados: apiClient, contratos em @marginflow/types, primitives em components/ui-premium e o layout protegido atual.
- Itens para substituir/extrair: formatadores repetidos, regras de estado financeiro no JSX e placeholders de KPI/insights embutidos nos componentes.
---
## Milestone 2 ??? Estrutura Modular do Dashboard
### Objetivo
Criar a base modular para a nova p??gina.
### Tasks
- [x] Criar ou reorganizar pasta do m??dulo de dashboard
- [x] Criar arquivo de tipos do dashboard
- [x] Criar utilit??rios de formata????o monet??ria
- [x] Criar utilit??rios de formata????o percentual
- [x] Criar camada de c??lculos financeiros
- [x] Criar fun????o para determinar sa??de financeira do produto
- [x] Criar estrutura inicial dos componentes
- [x] Garantir imports limpos e consistentes
### Crit??rios de aceite
- [x] C??digo modularizado
- [x] Nenhuma regra financeira importante fica escondida no JSX
- [x] Componentes principais j?? existem, mesmo que inicialmente simples
### Notas da estrutura modular
- Novo boundary criado em apps/web/src/modules/dashboard com components, hooks, calculations, types e utils.
- DashboardHome virou raiz de composi????o e passou a consumir useDashboardData, useDashboardFilters e helpers puros.
- Componentes legados em apps/web/src/components/dashboard ficaram como thin re-exports para evitar churn desnecess??rio.
---
## Milestone 3 — Novo Layout Principal

### Objetivo

Construir a estrutura visual da nova página.

### Tasks

- [ ] Criar header inteligente
- [ ] Criar container principal responsivo
- [ ] Criar grid base da página
- [ ] Criar área de filtros globais
- [ ] Criar área de KPIs
- [ ] Criar área de insights
- [ ] Criar área de gráficos
- [ ] Criar área de produtos em destaque
- [ ] Criar área da tabela/lista de produtos
- [ ] Criar área de alertas financeiros
- [ ] Criar área de resumo operacional
- [ ] Aplicar tema white/off-white premium
- [ ] Aplicar espaçamentos consistentes
- [ ] Aplicar bordas e sombras sutis

### Critérios de aceite

- [ ] Página possui nova hierarquia visual
- [ ] Página é escaneável
- [ ] Layout não parece uma planilha
- [ ] Layout funciona em desktop, tablet e mobile

---

## Milestone 4 — Cards de KPIs

### Objetivo

Implementar cards de indicadores principais.

### Tasks

- [ ] Criar componente `KpiCard`
- [ ] Criar componente `KpiGrid`
- [ ] Exibir faturamento
- [ ] Exibir lucro bruto
- [ ] Exibir lucro líquido
- [ ] Exibir margem média
- [ ] Exibir ROI médio
- [ ] Exibir ROAS médio
- [ ] Exibir investimento em Ads
- [ ] Exibir quantidade de produtos críticos
- [ ] Criar estados visuais positivo/neutro/crítico
- [ ] Adicionar tooltips quando fizer sentido
- [ ] Adicionar skeleton de carregamento

### Critérios de aceite

- [ ] Todos os KPIs principais aparecem corretamente
- [ ] Valores monetários estão em BRL
- [ ] Percentuais estão legíveis
- [ ] Cards respondem bem em telas menores

---

## Milestone 5 — Filtros Globais

### Objetivo

Permitir exploração rápida dos dados.

### Tasks

- [ ] Criar componente de filtros
- [ ] Implementar busca por produto/SKU
- [ ] Implementar filtro por marketplace
- [ ] Implementar filtro por status financeiro
- [ ] Implementar filtro por período, se houver dados disponíveis
- [ ] Aplicar filtros nos KPIs
- [ ] Aplicar filtros nos gráficos
- [ ] Aplicar filtros na tabela
- [ ] Adicionar botão de limpar filtros
- [ ] Persistir filtros na URL ou store, se o projeto já usar esse padrão

### Critérios de aceite

- [ ] Filtros impactam a página inteira
- [ ] Busca funciona sem travar
- [ ] Limpar filtros restaura visão geral

---

## Milestone 6 — Insights e Alertas

### Objetivo

Transformar dados em diagnósticos acionáveis.

### Tasks

- [ ] Criar engine simples de insights
- [ ] Detectar produtos com lucro negativo
- [ ] Detectar produtos com margem baixa
- [ ] Detectar produtos com ROAS ruim
- [ ] Detectar produtos com alta devolução
- [ ] Detectar marketplace mais lucrativo
- [ ] Detectar produto mais lucrativo
- [ ] Criar componente `InsightsPanel`
- [ ] Criar componente `FinancialAlerts`
- [ ] Criar badges de severidade
- [ ] Criar empty state quando não houver alertas

### Critérios de aceite

- [ ] Página exibe insights úteis
- [ ] Alertas são baseados em regras claras
- [ ] Alertas não poluem visualmente a página

---

## Milestone 7 — Gráficos

### Objetivo

Exibir visão visual da performance.

### Tasks

- [ ] Criar gráfico de faturamento vs lucro
- [ ] Criar gráfico de performance por marketplace
- [ ] Criar gráfico de margem por produto
- [ ] Adicionar loading state nos gráficos
- [ ] Adicionar empty state nos gráficos
- [ ] Garantir responsividade dos gráficos
- [ ] Evitar poluição visual
- [ ] Usar tooltips claros

### Critérios de aceite

- [ ] Gráficos ajudam na leitura da operação
- [ ] Gráficos não quebram em telas menores
- [ ] Dados ausentes são tratados corretamente

---

## Milestone 8 — Produtos em Destaque

### Objetivo

Mostrar rapidamente campeões e críticos da operação.

### Tasks

- [ ] Criar componente `FeaturedProducts`
- [ ] Exibir produto mais lucrativo
- [ ] Exibir produto com melhor ROI
- [ ] Exibir produto com melhor margem
- [ ] Exibir produto mais crítico
- [ ] Exibir produto com maior gasto em Ads
- [ ] Criar visual compacto e escaneável
- [ ] Adicionar empty state

### Critérios de aceite

- [ ] Usuário identifica rapidamente produtos relevantes
- [ ] Cards/listas não duplicam excesso de informação da tabela

---

## Milestone 9 — Tabela Principal de Produtos

### Objetivo

Refatorar a lista de produtos para uma tabela analítica premium.

### Tasks

- [ ] Criar componente `ProductsTable`
- [ ] Definir colunas principais
- [ ] Implementar coluna de produto/SKU
- [ ] Implementar coluna de marketplace
- [ ] Implementar coluna de vendas/devoluções
- [ ] Implementar coluna de receita
- [ ] Implementar coluna de Ads/ROAS
- [ ] Implementar coluna de lucro
- [ ] Implementar coluna de margem
- [ ] Implementar coluna de ROI
- [ ] Implementar coluna de status financeiro
- [ ] Implementar ordenação
- [ ] Implementar busca integrada
- [ ] Implementar badges visuais
- [ ] Implementar skeleton
- [ ] Implementar empty state
- [ ] Implementar versão mobile compacta
- [ ] Avaliar virtualização caso exista volume alto de linhas

### Critérios de aceite

- [ ] Tabela é clara e operacional
- [ ] Usuário consegue identificar produtos bons e ruins rapidamente
- [ ] Tabela mantém boa performance
- [ ] Tabela é utilizável em telas menores

---

## Milestone 10 — Estados de UI

### Objetivo

Garantir robustez visual.

### Tasks

- [ ] Criar loading state geral da página
- [ ] Criar loading state dos cards
- [ ] Criar loading state dos gráficos
- [ ] Criar loading state da tabela
- [ ] Criar empty state geral
- [ ] Criar empty state de filtros sem resultado
- [ ] Criar error state
- [ ] Criar fallback para campos nulos
- [ ] Garantir que valores inválidos não quebrem a UI

### Critérios de aceite

- [ ] Página nunca fica visualmente quebrada
- [ ] Dados ausentes são tratados elegantemente
- [ ] Erros são compreensíveis para o usuário

---

## Milestone 11 — Responsividade e Polimento Visual

### Objetivo

Finalizar experiência premium.

### Tasks

- [ ] Ajustar layout desktop
- [ ] Ajustar layout tablet
- [ ] Ajustar layout mobile
- [ ] Ajustar espaçamentos
- [ ] Ajustar tipografia
- [ ] Ajustar contraste
- [ ] Ajustar sombras
- [ ] Ajustar bordas
- [ ] Adicionar microinterações com Framer Motion
- [ ] Garantir que animações sejam discretas
- [ ] Revisar consistência visual com o restante da plataforma

### Critérios de aceite

- [ ] Página parece premium
- [ ] Página é agradável em diferentes tamanhos de tela
- [ ] Animações não atrapalham performance

---

## Milestone 12 — Testes, QA e Finalização

### Objetivo

Garantir qualidade antes de finalizar.

### Tasks

- [ ] Rodar TypeScript check
- [ ] Rodar lint
- [ ] Corrigir erros de build
- [ ] Testar filtros
- [ ] Testar cards
- [ ] Testar tabela
- [ ] Testar gráficos
- [ ] Testar estados vazios
- [ ] Testar responsividade
- [ ] Testar dados com valores zerados
- [ ] Testar dados com valores negativos
- [ ] Testar dados incompletos
- [ ] Revisar imports não utilizados
- [ ] Remover código morto
- [ ] Garantir que a rota principal não mudou sem necessidade

### Critérios de aceite

- [ ] Build passa
- [ ] Lint passa
- [ ] Página funciona com dados reais ou mockados
- [ ] Página funciona com dados ausentes
- [ ] Nenhum erro aparece no console em fluxo normal

---

## 13. Definition of Done

A refatoração estará concluída quando:

- [ ] A página principal foi redesenhada completamente
- [ ] Os KPIs principais estão visíveis
- [ ] A tabela/lista de produtos está clara e útil
- [ ] Os gráficos principais estão funcionando
- [ ] Os insights e alertas estão implementados
- [ ] Filtros globais funcionam
- [ ] Estados de loading, empty e error existem
- [ ] Layout é responsivo
- [ ] Código está modularizado
- [ ] Cálculos estão fora do JSX
- [ ] TypeScript passa
- [ ] Lint passa
- [ ] Build passa

---

## 14. Observações para o Agente de Codificação

- Não criar páginas novas se não for necessário.
- Refatorar a página principal existente.
- Não quebrar rotas existentes.
- Não remover lógica útil sem entender o impacto.
- Preferir componentes pequenos e reutilizáveis.
- Manter regras financeiras centralizadas.
- Não espalhar cálculos dentro do JSX.
- Usar dados reais existentes quando disponíveis.
- Se dados reais ainda não existirem, criar camada adaptadora temporária com mocks tipados.
- Evitar overengineering.
- Priorizar clareza, performance e manutenibilidade.
- Cada milestone deve ser implementada de forma incremental.
- Após cada milestone, o projeto deve continuar compilando.
- Sempre marcar tasks concluídas neste arquivo conforme forem implementadas.

---

## 15. Ordem Recomendada de Execução

1. Auditoria da página atual
2. Estrutura modular
3. Layout principal
4. KPIs
5. Filtros
6. Insights
7. Gráficos
8. Produtos em destaque
9. Tabela principal
10. Estados de UI
11. Responsividade
12. QA final

---

## 16. Resultado Esperado

Ao final, a página principal deve deixar de parecer apenas uma tela com números e passar a funcionar como uma central de comando financeira.

O usuário deve entrar e entender, em poucos segundos:

- o estado atual da operação
- onde está ganhando dinheiro
- onde está perdendo dinheiro
- quais produtos merecem escala
- quais produtos precisam de correção
- como os marketplaces estão performando
- qual é a saúde financeira geral do negócio


