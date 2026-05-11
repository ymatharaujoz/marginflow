# REFACTOR-FRONT

## Objetivo

Alinhar o front-end protegido de `marginflow` com:

- APIs e schemas alterados recentemente
- contratos compartilhados em `packages/types`
- regras de calculo e negocio de [DATABASE.md](C:\Users\ymath\OneDrive\Documentos\Projects\marginflow\DATABASE.md)

Escopo obrigatorio:

- `/app`
- `/app/products`

Escopo indireto:

- `/app/integrations` apenas quando impactar review/import/link/ignore ou origem dos dados usados no dashboard e na pagina de produtos

## Resumo Executivo

Estado atual confirmado:

- dashboard ja consome APIs reais de `/dashboard/*`
- dashboard ainda completava metricas detalhadas com fallbacks locais
- pagina de produtos ainda roda em modo demo permanente com mock e simulacao local
- `DATABASE.md` descreve formulas deterministicas que ainda nao aparecem de forma consistente no front

Decisao adotada para este refactor:

- backend continua como fonte principal de verdade para dados persistidos, sync, vinculos e agregacoes
- frontend so pode derivar apresentacao e estados de UX quando os insumos ja vierem explicitos
- mocks permanentes, constantes magicas e heuristicas visuais devem ser removidos do dashboard
- quando a API atual nao tiver fonte operacional suficiente, o gap precisa ficar documentado de forma explicita

## Estado Atual Confirmado

### Dashboard

Fontes reais ja usadas:

- `GET /dashboard/summary`
- `GET /dashboard/charts`
- `GET /dashboard/recent-sync`
- `GET /dashboard/profitability`

Arquivos-chave:

- [dashboard.service.ts](C:\Users\ymath\OneDrive\Documentos\Projects\marginflow\apps\api\src\modules\dashboard\dashboard.service.ts)
- [finance.ts](C:\Users\ymath\OneDrive\Documentos\Projects\marginflow\packages\types\src\finance.ts)
- [use-dashboard-data.ts](C:\Users\ymath\OneDrive\Documentos\Projects\marginflow\apps\web\src\modules\dashboard\hooks\use-dashboard-data.ts)

Gaps que existiam antes de M1/M2:

- `DashboardProfitabilityResponse.products[]` nao fechava o contrato detalhado da tabela do front
- `product-rows.ts` completava campos faltantes com percentuais fixos e custos inventados
- `kpi-data.ts` inferia `grossProfit`, `avgRoi` e `avgRoas`
- insights usavam metricas reais, mas sem matriz formal de responsabilidade por campo

### Produtos

Fontes atuais:

- `/products`
- `/costs/products`
- `/costs/ads`
- `/costs/expenses`
- `/integrations/mercadolivre/products`

Arquivos-chave:

- [use-product-data.ts](C:\Users\ymath\OneDrive\Documentos\Projects\marginflow\apps\web\src\modules\products\hooks\use-product-data.ts)
- [product-insights.ts](C:\Users\ymath\OneDrive\Documentos\Projects\marginflow\apps\web\src\modules\products\calculations\product-insights.ts)
- [products.service.ts](C:\Users\ymath\OneDrive\Documentos\Projects\marginflow\apps\api\src\modules\products\products.service.ts)
- [integrations.service.ts](C:\Users\ymath\OneDrive\Documentos\Projects\marginflow\apps\api\src\modules\integrations\integrations.service.ts)

Gaps atuais:

- `USE_MOCK_DATA = true` ainda forca a pagina de produtos a operar em demo
- `salesSimulation` ainda inventa vendas, devolucoes e ads por produto
- comissao, frete, imposto e embalagem ainda sao calculados com constantes locais
- `CatalogStats`, insights e tabela ainda nao partem de base analitica unica
- produtos sincronizados reais ainda coexistem com camada analitica ficticia

### Regras de negocio do `DATABASE.md`

`DATABASE.md` define como fonte de regra:

- `net_sales_quantity`
- `revenue`
- `marketplace_commission_total`
- `shipping_total`
- `tax_total`
- `packaging_total`
- `product_cost_total`
- `unit_profit`
- `total_profit`
- `contribution_margin`
- `roi`
- `actual_roas`
- `minimum_roas`
- `gross_revenue`
- `average_margin`
- `net_profit`
- `break_even_point`

Regras importantes:

- `net_sales_quantity = max(0, sales_quantity - returns_quantity)`
- `average_margin` deve ser ponderada por receita
- `roi = 0` quando `advertising_cost <= 0`
- `actual_roas = 0` quando `advertising_cost <= 0`
- `minimum_roas = Infinity` quando `contribution_margin <= 0`
- `break_even_point = Infinity` quando `average_margin <= 0`

## Milestone 1 - Congelar Matriz de Verdade Front x API x Schema

Objetivo:

Criar uma matriz de referencia dentro do proprio documento para impedir novas divergencias entre payload, tipo compartilhado e renderizacao.

Entregas:

- tabela comparando cada bloco do dashboard com sua origem real
- tabela comparando cada bloco de `/app/products` com sua origem real
- coluna por item: `campo exibido`, `tipo atual`, `origem atual`, `regra de calculo`, `classificacao da origem`, `gap`, `acao`
- separacao entre:
  - dado persistido
  - dado agregado pelo backend
  - dado calculavel no frontend
  - dado hoje inexistente

Decisao tecnica:

- nenhum componente novo deve nascer sem primeiro mapear de onde vem cada numero exibido

Criterio de aceite:

- toda KPI, indicador, insight e coluna principal de tabela tem origem declarada
- toda divergencia com `DATABASE.md` esta listada explicitamente

## Milestone 2 - Fechar Contrato do Dashboard

Objetivo:

Eliminar heuristicas locais do dashboard e torna-lo 100% dependente de contrato explicito.

Ajustes necessarios:

- manter endpoints atuais de dashboard
- revisar `DashboardSummaryMetrics` e documentar semantica oficial de cada campo
- revisar `DashboardProfitabilityResponse` para que cada produto ja traga os campos detalhados exigidos pela tabela

Campos que sairam do estado opcional e viraram contrato explicito:

- `channel`
- `sales`
- `returns`
- `netSales`
- `salePrice`
- `revenue`
- `marketplaceCommission`
- `shippingCost`
- `taxAmount`
- `packagingCost`
- `productCost`
- `adSpend`
- `grossProfit`
- `roi`
- `roas`
- `margin`

Front-end ajustado:

- [product-rows.ts](C:\Users\ymath\OneDrive\Documentos\Projects\marginflow\apps\web\src\modules\dashboard\calculations\product-rows.ts)
- [kpi-data.ts](C:\Users\ymath\OneDrive\Documentos\Projects\marginflow\apps\web\src\modules\dashboard\calculations\kpi-data.ts)
- [insights.ts](C:\Users\ymath\OneDrive\Documentos\Projects\marginflow\apps\web\src\modules\dashboard\calculations\insights.ts)

Removido do dashboard:

- comissao calculada por fallback percentual
- frete calculado por valor fixo
- imposto calculado por valor fixo
- embalagem calculada por valor fixo
- `grossProfit`, `avgRoi`, `avgRoas` inferidos sem contrato

Criterio de aceite:

- dashboard nao gera numero financeiro usando chute
- ausencia de campo deixa de ser preenchida por heuristica local

## Matriz de Verdade Congelada

### `/app` - dashboard protegido

| campo exibido | tipo atual | origem atual | regra de calculo | classificacao da origem | gap | acao |
|---|---|---|---|---|---|---|
| KPI `Faturamento` | `DashboardSummaryMetrics.grossRevenue` | `GET /dashboard/summary` | soma de `ExternalOrder.totalAmount` materializada pelo backend | agregado backend | sem gap de contrato | manter backend como fonte oficial |
| KPI `Lucro bruto` | `DashboardSummaryMetrics.grossProfit` | `GET /dashboard/summary` | `netRevenue - totalCogs - totalFees` | agregado backend | antes era inferido no front por `netProfit * 1.15` | contrato obrigatorio em `packages/types` e helper sem fallback |
| KPI `Lucro liquido` | `DashboardSummaryMetrics.netProfit` | `GET /dashboard/summary` | `contributionMargin - totalManualExpenses` | agregado backend | sem gap de payload | manter calculo no backend |
| KPI `Margem media` | `DashboardSummaryMetrics.grossMarginPercent` | `GET /dashboard/summary` | `grossProfit / grossRevenue`, ponderada por receita no agregado | agregado backend | divergencia antiga com semantica frouxa de margem | semantica oficial documentada no tipo compartilhado |
| KPI `ROI medio` | `DashboardSummaryMetrics.avgRoi` | `GET /dashboard/summary` | `grossProfit / totalCogs` | agregado backend | antes podia ficar implicito ou vazio no front | helper sem inferencia local |
| KPI `ROAS medio` | `DashboardSummaryMetrics.avgRoas` | `GET /dashboard/summary` | `grossRevenue / totalAdCosts`, `0` quando nao ha ads | agregado backend | antes podia ficar implicito ou vazio no front | helper sem inferencia local |
| cards de contexto (`ordersCount`, `unitsSold`, `avgTicket`, `totalReturns`) | `DashboardSummaryMetrics` | `GET /dashboard/summary` | contagem agregada por pedidos/unidades; `avgTicket = grossRevenue / ordersCount` | agregado backend | `totalReturns` ainda e zero explicito porque sync atual nao importa devolucoes | manter zero explicito e registrar fonte faltante |
| grafico de receita/lucro/unidades | `DashboardChartsResponse.daily[]` | `GET /dashboard/charts` | agregacao diaria do read model | agregado backend | sem gap de contrato | manter contrato atual |
| bloco `Recent sync` | `DashboardRecentSyncResponse` | `GET /dashboard/recent-sync` | leitura do `SyncService.getStatus()` | agregado backend | sem gap de contrato | manter contrato atual |
| tabela `Top produtos` - `sales`, `returns`, `netSales`, `salePrice`, `revenue`, `marketplaceCommission`, `shippingCost`, `taxAmount`, `packagingCost`, `productCost`, `adSpend`, `grossProfit`, `roi`, `roas`, `margin`, `channel` | `DashboardProfitabilityResponse.products[]` | `GET /dashboard/profitability` | mapeamento explicito em `FinanceService.buildDashboardReadModel()` | agregado backend | `shippingCost`, `taxAmount`, `packagingCost` e `returns` ainda nao possuem fonte operacional dedicada no snapshot atual | manter contrato explicito, sem fallback no front, e tratar a captura dessas fontes como pendencia real |
| insights de negocio | `DashboardSummaryResponse.summary` | `GET /dashboard/summary` | thresholds em cima de metricas reais ja entregues | calculavel no frontend | thresholds ainda nao estao formalizados em `DATABASE.md` | manter apenas leitura de contrato |
| empty states `sync`, `catalog`, `insufficient` | `DashboardFinancialState` | combinacao de queries reais do dashboard | derivacao de apresentacao sem numero financeiro novo | calculavel no frontend | sem gap critico | manter distincao de estados no front |

### `/app/products` - hub operacional

| campo exibido | tipo atual | origem atual | regra de calculo | classificacao da origem | gap | acao |
|---|---|---|---|---|---|---|
| catalogo manual | `ProductListItem[]` | `/products` | persistencia direta | persistido | sem gap estrutural | manter como base do hub |
| custos por produto | `ProductCostRecord[]` | `/costs/products` | persistencia direta | persistido | sem gap estrutural | manter como base do hub |
| ads por produto | `AdCostRecord[]` | `/costs/ads` | persistencia direta | persistido | dados reais existem, mas tela principal ainda nao os usa como base unica | unificar em snapshot analitico no milestone 3 |
| despesas manuais | `ManualExpenseRecord[]` | `/costs/expenses` | persistencia direta | persistido | ainda nao entram numa visao consolidada por produto | unificar em snapshot analitico no milestone 3 |
| review/import/link/ignore de sincronizados | `SyncedProductRecord[]` | `/integrations/mercadolivre/products` | leitura protegida do fluxo de sync | agregado backend | sem gap de ownership | preservar no mesmo hub |
| tabela financeira principal (`rows`) | `ProductTableRow[]` | `buildProductTableRows()` | hoje depende de `salesSimulation`, comissao fixa, frete fixo, imposto fixo e embalagem fixa | calculavel no frontend | viola `DATABASE.md` e mistura dados reais com ficcao | nao alterar nesta milestone; tratar como debito explicito do milestone 3 |
| `CatalogStats` | `CatalogStats` | `buildCatalogStats()` | derivacao local sobre base hibrida | calculavel no frontend | nao parte de base analitica unica | migrar para snapshot analitico real no milestone 3 |
| insights de produto | `buildProductInsights()` | frontend | thresholds locais sobre base hibrida | calculavel no frontend | linguagem e alertas ainda dependem de dados simulados | recalcular sobre snapshot real no milestone 3 |
| `USE_MOCK_DATA = true` em `use-product-data.ts` | flag local | frontend | chave hardcoded de demo | inexistente hoje | bloqueia uso real da pagina | manter como gap aberto de `/app/products`; fora do escopo implementado em M1/M2 |

## Semantica Oficial de `DashboardSummaryMetrics`

- `grossRevenue`: receita bruta somada dos pedidos importados.
- `netRevenue`: receita liquida apos descontos/refundos conhecidos no snapshot atual.
- `grossProfit`: lucro antes de ads e despesas manuais, calculado por `netRevenue - totalCogs - totalFees`.
- `contributionMargin`: lucro apos fees, COGS e ads, antes de despesas manuais.
- `netProfit`: lucro final apos `contributionMargin - totalManualExpenses`.
- `grossMarginPercent`: margem media oficial do dashboard, derivada de `grossProfit / grossRevenue`.
- `avgRoi`: ROI agregado do catalogo, derivado de `grossProfit / totalCogs`.
- `avgRoas`: ROAS agregado do catalogo, derivado de `grossRevenue / totalAdCosts`.
- `avgTicket`: ticket medio por pedido, derivado de `grossRevenue / ordersCount`.
- `totalReturns`: devolucoes conhecidas no periodo; enquanto o sync atual nao importar devolucoes, fica `0` explicito em vez de heuristica.

## Milestone 3 - Criar Snapshot Analitico Real para `/app/products`

Objetivo:

Trocar a camada demo da pagina de produtos por uma base analitica real e reproduzivel.

Problema atual:

- APIs existentes entregam catalogo e custos, mas nao uma visao consolidada por produto com vendas reais
- front ainda resolve isso com mock e simulacao, o que quebra aderencia ao negocio

Ajuste recomendado:

Criar um snapshot analitico protegido para `/app/products`, agregando:

- `products`
- `productCosts`
- `adCosts`
- `manualExpenses`
- `syncedProducts`
- `productRows`
- `catalogStats`
- `financialState`

Alternativa aceitavel:

- manter multiplos endpoints, desde que a API passe a entregar todos os insumos brutos necessarios para calculo deterministico local

Requisitos de `productRows`:

- usar vendas reais ou sinal real vindo de sync
- respeitar formulas de `DATABASE.md`
- nao depender de `salesSimulation`
- nao depender de margens simplificadas baseadas apenas em `sellingPrice - latestCost`

Pre-requisitos backend:

- decidir onde a agregacao vivera
- garantir que vinculacao de `external_products.linked_product_id` continue priorizada
- preservar review/import/link/ignore no mesmo hub

Criterio de aceite:

- `/app/products` funciona com dados reais
- nenhum fluxo principal depende de mock hardcoded

## Milestone 4 - Mover Regra de Calculo para Camada Certa

Objetivo:

Definir fronteira definitiva entre calculo de negocio e calculo de apresentacao.

Principio:

- se o calculo depende de consolidar dados de multiplas fontes operacionais, ele deve nascer do backend ou de um contrato analitico explicito
- se o calculo e derivacao direta de campos ja entregues, ele pode acontecer no front

Aplicacao pratica:

- dashboard summary e profitability devem sair prontos do backend ou com insumos completos
- pagina de produtos pode derivar formatacao, status visual e pequenos indicadores
- regras centrais de rentabilidade nao devem ser duplicadas em versoes divergentes entre dashboard e products

Regras que precisam ser unificadas:

- calculo de lucro por produto
- calculo de margem
- calculo de ROI
- calculo de ROAS real
- calculo de ROAS minimo
- calculo de break-even
- criterios de "dados insuficientes"
- criterios de saude do produto

Criterio de aceite:

- existe uma unica definicao tecnica por metrica
- dashboard e products deixam de competir por interpretacoes diferentes do mesmo dado

## Milestone 5 - Refactor do Front do Dashboard

Objetivo:

Adequar `/app` ao contrato final sem alterar a estrutura funcional aprovada.

Itens:

- alinhar cards de KPI aos campos realmente disponiveis
- revisar helper texts para nao prometer metrica nao sustentada por contrato
- ajustar tabela de produtos para consumir somente campos oficiais
- revisar insights para nao usar thresholds soltos sem documentacao
- manter empty states distintos:
  - sem sync
  - sem custos/catalogo
  - sinal insuficiente

Arquivos com maior chance de ajuste:

- [dashboard-home.tsx](C:\Users\ymath\OneDrive\Documentos\Projects\marginflow\apps\web\src\modules\dashboard\components\dashboard-home.tsx)
- [products-table.tsx](C:\Users\ymath\OneDrive\Documentos\Projects\marginflow\apps\web\src\modules\dashboard\components\products-table.tsx)
- [kpi-cards.tsx](C:\Users\ymath\OneDrive\Documentos\Projects\marginflow\apps\web\src\modules\dashboard\components\kpi-cards.tsx)

Criterio de aceite:

- dashboard passa a refletir apenas verdade de contrato
- qualquer ausencia de dado aparece como estado honesto, nao como numero inventado

## Milestone 6 - Refactor do Front de Produtos

Objetivo:

Transformar `/app/products` em tela operacional real, mantendo o hub unico de catalogo + review de sincronizados.

Itens:

- remover dependencia de `mock-product-data.ts` do fluxo principal
- desligar `USE_MOCK_DATA = true`
- substituir `salesSimulation` por dados reais
- recalcular `CatalogStats` sobre base analitica real
- recalcular insights sobre base analitica real
- alinhar tabela ao mesmo vocabulario usado no dashboard

Regras de UX a preservar:

- produtos manuais e sincronizados coexistem
- produto sincronizado nao vira interno automaticamente
- review/import/link/ignore continua dentro do hub atual

Arquivos com maior chance de ajuste:

- [products-home.tsx](C:\Users\ymath\OneDrive\Documentos\Projects\marginflow\apps\web\src\modules\products\components\products-home.tsx)
- [use-product-data.ts](C:\Users\ymath\OneDrive\Documentos\Projects\marginflow\apps\web\src\modules\products\hooks\use-product-data.ts)
- [product-insights.ts](C:\Users\ymath\OneDrive\Documentos\Projects\marginflow\apps\web\src\modules\products\calculations\product-insights.ts)

Criterio de aceite:

- pagina de produtos apresenta rentabilidade e alertas baseados em dados reais
- review de sincronizados continua funcional
- tabela deixa de exibir metricas ficticias

## Milestone 7 - Hardening de Tipos, Testes e Guardrails

Objetivo:

Impedir regressao para estado hibrido de "dados reais + estimativa local".

Testes necessarios:

- contrato de `GET /dashboard/profitability` com produto detalhado completo
- contrato do snapshot analitico de `/app/products`
- teste de dashboard sem fallbacks magicos
- teste de products sem mock como fonte principal
- teste de `average_margin` ponderada por receita
- teste de `roi`, `actual_roas`, `minimum_roas` e `break_even_point` com fail-safe
- teste de empty states distintos
- teste de review/import/link/ignore preservado no hub

Guardrails recomendados:

- bloquear `USE_MOCK_DATA` permanente fora de ambiente explicito de demo
- centralizar formatadores e parsers numericos
- evitar tipos opcionais para metricas obrigatorias de tabela analitica

Criterio de aceite:

- front falha cedo quando contrato quebra
- time nao volta a completar payload faltante com chute local

## Interfaces e Contratos que Precisam Mudar

### Dashboard

- `DashboardSummaryMetrics`
- `DashboardProductProfitabilityRow`
- `DashboardProfitabilityResponse`

### Produtos

Uma destas duas opcoes deve ser oficializada:

1. novo snapshot analitico para `/app/products`
2. ampliacao dos contratos atuais para fornecer todos os insumos exigidos pelas formulas do `DATABASE.md`

Recomendacao:

- preferir snapshot analitico porque reduz duplicacao de chamadas, simplifica cache e elimina reconstrucoes divergentes no client

## Regras de Negocio que Devem Guiar Implementacao

- nenhuma metrica financeira deve depender de constante local arbitraria
- `average_margin` sempre ponderada por receita
- `minimum_roas` e `break_even_point` precisam tratamento explicito para casos nao calculaveis
- ausencia de ads nao pode gerar ROI/ROAS falsos positivos
- ausencia de sync nao pode ser mascarada por mock
- ausencia de custo nao pode ser mascarada por margem simplificada
- vinculo explicito de produto sincronizado deve prevalecer sobre fallback por SKU

## Ordem Recomendada de Execucao

1. congelar matriz de verdade
2. fechar contrato de dashboard
3. definir snapshot analitico de products
4. unificar regras de calculo
5. refatorar dashboard
6. refatorar `/app/products`
7. endurecer testes e guardrails

## Status Honesto Apos Implementacao de M1/M2

- `DashboardSummaryMetrics` e `DashboardProductProfitabilityRow` deixaram de tratar metricas analiticas do dashboard como opcionais.
- `FinanceService` passou a materializar payload completo para `/dashboard/profitability`, incluindo `channel`, `sales`, `netSales`, `salePrice`, `revenue`, `marketplaceCommission`, `productCost`, `adSpend`, `grossProfit`, `roi`, `roas` e `margin`.
- `product-rows.ts` e `kpi-data.ts` deixaram de inventar comissao, frete, imposto, embalagem, lucro bruto, ROI medio e ROAS medio.
- `use-dashboard-data.ts` continua aceitando mock apenas por flag explicita de ambiente; fluxo normal do `/app` permanece real.
- `returns`, `shippingCost`, `taxAmount` e `packagingCost` ainda nao possuem fonte operacional dedicada no snapshot atual de financas.
- Para impedir heuristica no front, o backend agora devolve `0`/`0.00` explicito nesses campos quando a fonte ainda nao existe.
- Isso fecha o contrato do dashboard sem chutes locais, mas nao significa que a captura completa dessas dimensoes ja foi resolvida no modelo operacional.
- `/app/products` continua em modo analitico hibrido; este documento deixa isso congelado como debito do milestone 3.

## Status Honesto Apos Implementacao de M3/M4

- `/app/products` agora consome um unico endpoint protegido `GET /products/analytics`.
- o backend passou a devolver `ProductAnalyticsSnapshot` com `productRows`, `catalogStats`, `financialState` e `dataGaps`.
- `packages/domain` ganhou uma trilha canonica de `buildProductAnalyticsMetrics()`; o dashboard continua usando uma projecao desse mesmo calculo em vez de manter logica paralela.
- `use-product-data.ts` deixou de depender das 5 chamadas separadas e o modo mock permanente saiu do fluxo principal; mock continua possivel apenas por flag explicita de ambiente.
- `salesSimulation`, comissao local fixa, frete local fixo, imposto local fixo e embalagem local fixa deixaram de alimentar a tabela principal de `/app/products`.
- `CatalogStats`, `financialState` e a base da tabela agora nascem do snapshot oficial do backend; `health` e insights seguem no front, mas apenas como derivacao de metricas e flags oficiais.
- `manualExpenses` continuam fora do lucro por produto nesta etapa; elas permanecem no agregado do catalogo e nao sao rateadas localmente.
- `returns`, `shippingCost`, `taxAmount` e `packagingCost` continuam sem fonte operacional dedicada; o snapshot devolve valores explicitos e registra o gap em `dataGaps`, sem heuristica no client.
