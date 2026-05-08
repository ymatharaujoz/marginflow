# Redesign da Página /app/integrations

## Análise do Padrão /app/ (Dashboard)

O dashboard usa uma estrutura clean e minimalista:

1. **DashboardHeader**: Título grande + badge de status + subtítulo + ações em border-bottom
2. **KpiCards**: Grid de 6 cards (2 mobile, 3 tablet, 6 desktop) com StatCard
3. **StatCard**: Ícone (5x5) + label (uppercase, small) + valor (28px) + trend opcional
4. **Layout**: space-y-5 entre seções, containerVariants para animações

## Proposta de Redesign

### Estrutura Atual (problemas visuais)

```
[IntegrationsHub]
├── Demo Banner
├── Message Banner (erro/sucesso)
├── IntegrationsHeader (título + badge + ações)
├── IntegrationCards (grid 2 cols, cards complexos)
│   └── Card com:
│       ├── Status line (topo colorido)
│       ├── Header (ícone + nome + provider + badge)
│       ├── Descrição
│       ├── Grid 2x2 de info (Conta, Token, Sync)
│       └── Botões de ação
└── SyncSection (card grande)
    ├── Header com botão
├── Grid 4 status tiles (compactos)
└── Histórico em lista
```

### Nova Estrutura (padrão dashboard)

```
[IntegrationsHub]
├── Demo Banner (se necessário)
├── Message Banner
├── IntegrationsHeader (igual DashboardHeader)
│   ├── Título "Integrações"
│   ├── Badge de status (Conectado/Desconectado)
│   ├── Subtítulo com nome da org
│   └── Border-bottom com ações
├── IntegrationStatusCards (estilo KpiCards)
│   └── Grid de 4 StatCards:
│       ├── Mercado Livre (status + botão conectar)
│       ├── Última Sync (data/hora)
│       ├── Próxima Janela (contador)
│       └── Sincronizações Hoje (contador)
├── SyncControlSection (estilo compacto)
│   ├── Card clean com:
│   ├── Status atual (badge grande)
│   ├── Botão "Sincronizar Agora" (primary)
│   └── Próxima janela (texto secundário)
└── SyncHistorySection (lista minimalista)
    ├── Header "Histórico de Sincronizações"
    └── Lista clean (data, status, pedidos)
```

## Mudanças Detalhadas

### 1. IntegrationsHeader

**Atual:** Layout próprio, não segue padrão
**Novo:** Copiar estrutura do DashboardHeader

```tsx
<motion.div variants={fadeInVariants} className="space-y-4">
  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Integrações
        </h1>
        <StatusBadge status={connected ? "success" : "inactive"} label={connected ? "Conectado" : "Desconectado"} />
      </div>
      <p className="text-sm text-muted-foreground">
        Gerencie a conexão de <span className="font-medium text-foreground">{organizationName}</span> com marketplaces.
      </p>
    </div>
  </div>

  <div className="flex flex-wrap items-center gap-3 border-y border-border py-4">
    <Button onClick={handleConnect} disabled={connected} size="sm" className="gap-2">
      <Plug className="h-4 w-4" />
      <span>{connected ? "Conectado" : "Conectar Mercado Livre"}</span>
    </Button>
    <Button onClick={handleSync} disabled={!canSync} loading={isSyncing} size="sm" variant="secondary" className="gap-2">
      <RefreshCw className="h-4 w-4" />
      <span>Sincronizar</span>
    </Button>
  </div>
</motion.div>
```

### 2. IntegrationStatusCards (novo componente)

**Estilo:** KpiCards do dashboard - 4 cards tipo StatCard

```tsx
<motion.div variants={containerVariants} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
  {/* Card 1: Mercado Livre */}
  <StatCard
    label="Mercado Livre"
    value={connected ? "Conectado" : "Desconectado"}
    icon={<Store className="h-4 w-4" />}
    variant={connected ? "success" : "default"}
  />

  {/* Card 2: Última Sincronização */}
  <StatCard
    label="Última Sincronização"
    value={lastSync ? formatRelativeTime(lastSync) : "Nunca"}
    icon={<Clock className="h-4 w-4" />}
    variant="default"
  />

  {/* Card 3: Próxima Janela */}
  <StatCard
    label="Próxima Janela"
    value={nextWindow || "Agora"}
    icon={<Calendar className="h-4 w-4" />}
    variant={canSync ? "accent" : "default"}
  />

  {/* Card 4: Sincronizações Hoje */}
  <StatCard
    label="Sincronizações Hoje"
    value={String(todayCount)}
    icon={<RefreshCw className="h-4 w-4" />}
    trend={{ direction: "neutral", value: `${remaining} restantes` }}
    variant="default"
  />
</motion.div>
```

### 3. SyncControlSection (simplificado)

**Atual:** Card grande com header, grid de 4 tiles, lista
**Novo:** Card compacto com foco na ação principal

```tsx
<Card variant="elevated" className="p-6">
  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
    {/* Status lado esquerdo */}
    <div className="flex items-center gap-4">
      <div className={`flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] ${
        canSync ? "bg-accent/10 text-accent" : "bg-muted/20 text-muted-foreground"
      }`}>
        <RefreshCw className="h-6 w-6" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground">
          Sincronização Manual
        </h3>
        <p className="text-sm text-muted-foreground">
          {canSync 
            ? "Pronto para sincronizar. Última: há 2 horas."
            : "Sincronização bloqueada até a próxima janela."
          }
        </p>
      </div>
    </div>

    {/* Botão lado direito */}
    <Button
      size="lg"
      disabled={!canSync || isSyncing}
      loading={isSyncing}
      onClick={onSyncClick}
      className="shrink-0 lg:w-auto w-full"
    >
      <RefreshCw className="mr-2 h-4 w-4" />
      Sincronizar Agora
    </Button>
  </div>
</Card>
```

### 4. SyncHistorySection (lista minimalista)

**Atual:** Lista com cards individuais, gradientes, detalhes
**Novo:** Lista tipo tabela clean

```tsx
<section className="space-y-4">
  <div className="flex items-center justify-between">
    <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      Histórico de Sincronizações
    </h3>
    <Button
      size="sm"
      variant="ghost"
      onClick={onClearHistory}
      disabled={history.length === 0}
    >
      <Trash2 className="mr-1 h-3.5 w-3.5" />
      Limpar
    </Button>
  </div>

  {history.length === 0 ? (
    <EmptyState
      className="rounded-[var(--radius-lg)] border border-dashed border-border py-8"
      title="Nenhuma sincronização"
      description="Conecte seu Mercado Livre e execute a primeira sincronização."
    />
  ) : (
    <div className="rounded-[var(--radius-lg)] border border-border/60 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-surface-strong">
          <tr className="border-b border-border/60">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Pedidos</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Janela</th>
          </tr>
        </thead>
        <tbody>
          {history.map((run, i) => (
            <tr key={run.id} className={i !== history.length - 1 ? "border-b border-border/40" : ""}>
              <td className="px-4 py-3">
                <Badge variant={run.status === "completed" ? "success" : run.status === "failed" ? "error" : "neutral"}>
                  {translateStatus(run.status)}
                </Badge>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{formatDateTime(run.startedAt)}</td>
              <td className="px-4 py-3">{run.counts.orders} pedidos</td>
              <td className="px-4 py-3">
                <span className="font-mono text-xs text-muted-foreground">{run.windowKey}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</section>
```

## Resumo das Mudanças Visuais

| Elemento | Antes | Depois |
|----------|-------|--------|
| **Header** | Layout próprio | Copiar DashboardHeader |
| **Cards de integração** | Cards complexos com grid interno | StatCards simples tipo KPI |
| **Status da sync** | Grid 4 tiles compactos | Card clean com foco na ação |
| **Histórico** | Lista com cards e gradientes | Tabela minimalista clean |
| **Botões** | Variados (sm, ghost, etc) | Padronizados (sm primary + secondary) |
| **Cores** | Accent lines, gradientes | Sólidas, padrão do tema |

## Benefícios

1. **Consistência total** com o dashboard
2. **Foco na ação principal** (sincronizar)
3. **Informações priorizadas** (status > histórico)
4. **Menos poluição visual** (remove gradientes, lines decorativas)
5. **Escaneabilidade** (KPI cards são mais fáceis de escanear)
