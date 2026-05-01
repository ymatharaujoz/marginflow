"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge, Button, Card, EmptyState, Skeleton } from "@marginflow/ui";
import type {
  DashboardChartsResponse,
  DashboardProfitabilityResponse,
  DashboardRecentSyncResponse,
  DashboardSummaryMetrics,
  DashboardSummaryResponse,
} from "@marginflow/types";
import { ApiClientError, apiClient } from "@/lib/api/client";
import {
  translateApiMessage,
  translateDashboardCardHelper,
  translateDashboardCardLabel,
  translateSyncRunStatus,
} from "@/lib/pt-br/api-ui";

const dashboardSummaryQueryKey = ["dashboard-summary"] as const;
const dashboardChartsQueryKey = ["dashboard-charts"] as const;
const dashboardRecentSyncQueryKey = ["dashboard-recent-sync"] as const;
const dashboardProfitabilityQueryKey = ["dashboard-profitability"] as const;

const chartColors = {
  grossRevenue: "#0e7a6f",
  netProfit: "#141c22",
  warning: "#d97706",
};

function formatMoney(value: string | number) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric)
    ? new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" }).format(numeric)
    : String(value);
}

function formatDecimal(value: string | number, suffix = "") {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric)
    ? `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(numeric)}${suffix}`
    : `${String(value)}${suffix}`;
}

function formatMetricDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" }).format(
    new Date(`${value}T00:00:00`),
  );
}

function formatDateTime(value: string | null) {
  if (!value) return "Indisponível";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function formatProviderLabel(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

async function fetchDashboardSummary(): Promise<DashboardSummaryResponse> {
  const response = await apiClient.get<{ data: DashboardSummaryResponse; error: null }>("/dashboard/summary");
  return response.data;
}

async function fetchDashboardCharts(): Promise<DashboardChartsResponse> {
  const response = await apiClient.get<{ data: DashboardChartsResponse; error: null }>("/dashboard/charts");
  return response.data;
}

async function fetchDashboardRecentSync(): Promise<DashboardRecentSyncResponse> {
  const response = await apiClient.get<{ data: DashboardRecentSyncResponse; error: null }>("/dashboard/recent-sync");
  return response.data;
}

async function fetchDashboardProfitability(): Promise<DashboardProfitabilityResponse> {
  const response = await apiClient.get<{ data: DashboardProfitabilityResponse; error: null }>("/dashboard/profitability");
  return response.data;
}

function SectionHeader({
  title,
  description,
  action,
}: {
  action?: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}


function formatCardValue(label: string, value: string | number) {
  switch (label) {
    case "Gross margin":
      return formatDecimal(value, "%");
    case "Break-even revenue":
    case "Gross revenue":
    case "Net profit":
      return formatMoney(value);
    default:
      return typeof value === "number" ? String(value) : value;
  }
}

function KpiStrip({ data }: { data: DashboardSummaryResponse }) {
  const metrics = data.summary;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {data.cards.map((card, i) => (
        <div
          key={card.label}
          className="animate-rise-in rounded-[var(--radius-lg)] border border-border bg-surface-strong p-5 shadow-[var(--shadow-xs)] transition-shadow hover:shadow-[var(--shadow-sm)]"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {translateDashboardCardLabel(card.label)}
            </p>
            <Badge variant={card.tone === "positive" ? "success" : card.tone === "warning" ? "warning" : "neutral"}>
              {card.tone === "positive" ? "Positivo" : card.tone === "warning" ? "Atenção" : "—"}
            </Badge>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            {formatCardValue(card.label, card.value)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{translateDashboardCardHelper(card.label, metrics) || card.helperText}</p>
        </div>
      ))}
    </div>
  );
}

function SummaryDetails({ summary }: { summary: DashboardSummaryMetrics }) {
  const detailItems = [
    { label: "Receita líquida", value: formatMoney(summary.netRevenue) },
    { label: "Margem de contribuição", value: formatMoney(summary.contributionMargin) },
    { label: "CMV total", value: formatMoney(summary.totalCogs) },
    { label: "Taxas marketplace", value: formatMoney(summary.totalFees) },
    { label: "Custos em anúncios", value: formatMoney(summary.totalAdCosts) },
    { label: "Despesas manuais", value: formatMoney(summary.totalManualExpenses) },
    { label: "Unidades no breakeven", value: formatDecimal(summary.breakEvenUnits) },
    { label: "Pedidos / unidades", value: `${summary.ordersCount} / ${summary.unitsSold}` },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {detailItems.map((item) => (
        <div key={item.label} className="rounded-[var(--radius-md)] border border-border bg-background-soft px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
          <p className="mt-1.5 text-base font-semibold text-foreground">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function FinancialEmptyState({ reason }: { reason: "catalog" | "insufficient" | "sync" }) {
  if (reason === "sync") {
    return (
      <EmptyState
        title="Ainda sem dados de sincronização"
        description="Conecte o Mercado Livre e execute a primeira importação em Integrações para liberar tendências aqui."
        icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
      />
    );
  }
  if (reason === "catalog") {
    return (
      <EmptyState
        title="Cadastre custos de produto"
        description="Há dados de marketplace, mas faltam custos ou despesas para enxergar lucratividade com confiança."
        icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>}
      />
    );
  }
  return (
    <EmptyState
      title="Precisamos de mais dados"
      description="Continue sincronizando pedidos e registrando custos para o MarginFlow montar comparativos mais completos."
      icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>}
    />
  );
}

function normalizeEmptyStateReason(value: "catalog" | "insufficient" | "sync" | "ready" | null): "catalog" | "insufficient" | "sync" {
  if (value === "catalog" || value === "sync") return value;
  return "insufficient";
}

function determineFinancialState(
  summary: DashboardSummaryMetrics | undefined,
  charts: DashboardChartsResponse | undefined,
  profitability: DashboardProfitabilityResponse | undefined,
) {
  if (!summary || !charts || !profitability) return null;
  const hasSyncData = charts.daily.length > 0;
  const hasCatalogCosts = Number(summary.totalCogs) > 0 || Number(summary.totalAdCosts) > 0 || Number(summary.totalManualExpenses) > 0;
  const hasProfitabilitySignal = profitability.products.length > 0 && profitability.channels.length > 0 && hasCatalogCosts;
  if (!hasSyncData) return "sync" as const;
  if (!hasCatalogCosts) return "catalog" as const;
  if (!hasProfitabilitySignal) return "insufficient" as const;
  return "ready" as const;
}

function CustomChartTooltip({ active, label, payload }: { active?: boolean; label?: string; payload?: Array<{ color?: string; name?: string; value?: number | string }> }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-surface-strong px-3 py-2.5 shadow-[var(--shadow-md)]">
      <p className="text-xs font-semibold text-foreground">{label}</p>
      <div className="mt-1.5 space-y-0.5">
        {payload.map((entry) => (
          <p key={entry.name} className="text-xs" style={{ color: entry.color ?? "#141c22" }}>
            {entry.name}: {typeof entry.value === "number" ? formatMoney(entry.value) : entry.value}
          </p>
        ))}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
      <Skeleton className="h-80 w-full" />
    </div>
  );
}

export function DashboardHome({ organizationName }: { organizationName: string }) {
  const summaryQuery = useQuery({ queryFn: fetchDashboardSummary, queryKey: dashboardSummaryQueryKey });
  const chartsQuery = useQuery({ queryFn: fetchDashboardCharts, queryKey: dashboardChartsQueryKey });
  const recentSyncQuery = useQuery({ queryFn: fetchDashboardRecentSync, queryKey: dashboardRecentSyncQueryKey });
  const profitabilityQuery = useQuery({ queryFn: fetchDashboardProfitability, queryKey: dashboardProfitabilityQueryKey });

  const isUnauthorized = summaryQuery.error instanceof ApiClientError && summaryQuery.error.status === 401;
  const financialState = determineFinancialState(summaryQuery.data?.summary, chartsQuery.data, profitabilityQuery.data);
  const isLoading = summaryQuery.isLoading || chartsQuery.isLoading;

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="animate-rise-in">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Bem-vindo de volta, {organizationName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sua visão financeira cruzando dados sincronizados dos marketplaces e custos cadastrados.
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href="/app/integrations">Sincronizar</Link>
        </Button>
        <Button asChild size="sm" variant="secondary">
          <Link href="/app/products">Gerenciar custos</Link>
        </Button>
      </div>

      {isUnauthorized && (
        <Card variant="outlined" className="border-error/20 bg-error-soft">
          <p className="text-sm font-medium text-error">
            Sessão expirada. Entre novamente para ver os dados do painel.
          </p>
        </Card>
      )}

      {isLoading && <LoadingSkeleton />}

      {/* KPIs */}
      {!isUnauthorized && summaryQuery.data && (
        <section className="space-y-4">
          <KpiStrip data={summaryQuery.data} />
          <SummaryDetails summary={summaryQuery.data.summary} />
        </section>
      )}

      {/* Charts */}
      {!isUnauthorized && chartsQuery.data && (
        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
          <Card>
            <SectionHeader
              title="Tendências de desempenho"
              description="Receita diária e lucro líquido ao longo do tempo."
            />
            <div className="mt-5">
              {financialState && financialState !== "ready" && <FinancialEmptyState reason={financialState} />}
              {chartsQuery.data.daily.length > 0 && (
                <div className="h-72 rounded-[var(--radius-md)] border border-border bg-background-soft p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartsQuery.data.daily.map((point) => ({ ...point, label: formatMetricDate(point.metricDate) }))}
                      margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                      <XAxis dataKey="label" tick={{ fill: "#4a5660", fontSize: 11 }} tickLine={false} />
                      <YAxis tick={{ fill: "#4a5660", fontSize: 11 }} tickFormatter={(v) => formatMoney(v)} width={68} />
                      <Tooltip content={<CustomChartTooltip />} />
                      <Line type="monotone" dataKey="grossRevenue" name="Receita bruta" stroke={chartColors.grossRevenue} strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="netProfit" name="Lucro líquido" stroke={chartColors.netProfit} strokeWidth={2.5} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <SectionHeader
              title="Status da sincronização"
              description="Disponibilidade da janela e frescor dos dados."
              action={
                <Button asChild size="sm" variant="ghost">
                  <Link href="/app/integrations">Ver tudo</Link>
                </Button>
              }
            />
            <div className="mt-5 space-y-3">
              {recentSyncQuery.isLoading && <Skeleton className="h-20 w-full" />}
              {recentSyncQuery.data && (
                <>
                  <div className="rounded-[var(--radius-md)] border border-border bg-background-soft px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">Disponibilidade</p>
                      <Badge variant={recentSyncQuery.data.availability.canRun ? "success" : "warning"}>
                        {recentSyncQuery.data.availability.canRun ? "Disponível" : "Bloqueada"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{translateApiMessage(recentSyncQuery.data.availability.message)}</p>
                  </div>
                  <div className="rounded-[var(--radius-md)] border border-border bg-background-soft px-4 py-3">
                    <p className="text-xs font-medium text-muted-foreground">Última concluída</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {formatDateTime(recentSyncQuery.data.lastCompletedRun?.finishedAt ?? null)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {recentSyncQuery.data.lastCompletedRun
                        ? `${recentSyncQuery.data.lastCompletedRun.counts.orders} pedido${recentSyncQuery.data.lastCompletedRun.counts.orders === 1 ? "" : "s"} importado${recentSyncQuery.data.lastCompletedRun.counts.orders === 1 ? "" : "s"}`
                        : "Ainda não houve sincronização com sucesso"}
                    </p>
                  </div>
                  <div className="rounded-[var(--radius-md)] border border-border bg-background-soft px-4 py-3">
                    <p className="text-xs font-medium text-muted-foreground">Execução ativa</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {recentSyncQuery.data.activeRun
                        ? translateSyncRunStatus(recentSyncQuery.data.activeRun.status)
                        : "Nenhuma"}
                    </p>
                  </div>
                </>
              )}
            </div>
          </Card>
        </section>
      )}

      {/* Profitability */}
      {!isUnauthorized && chartsQuery.data && profitabilityQuery.data && (
        <section className="grid gap-6 xl:grid-cols-2">
          <Card>
            <SectionHeader
              title="Lucro por canal"
              description="Comparativo de receita e lucro por canal."
            />
            <div className="mt-5">
              {financialState === "ready" && chartsQuery.data.channels.length > 0 ? (
                <div className="h-64 rounded-[var(--radius-md)] border border-border bg-background-soft p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartsQuery.data.channels} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                      <XAxis dataKey="channel" tick={{ fill: "#4a5660", fontSize: 11 }} tickFormatter={(v) => formatProviderLabel(String(v))} tickLine={false} />
                      <YAxis tick={{ fill: "#4a5660", fontSize: 11 }} tickFormatter={(v) => formatMoney(v)} width={68} />
                      <Tooltip content={<CustomChartTooltip />} />
                      <Bar dataKey="netProfit" name="Lucro líquido" radius={[6, 6, 0, 0]}>
                        {chartsQuery.data.channels.map((row) => (
                          <Cell key={row.channel} fill={row.netProfit >= 0 ? chartColors.grossRevenue : chartColors.warning} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <FinancialEmptyState reason={normalizeEmptyStateReason(financialState)} />
              )}
            </div>
          </Card>

          <Card>
            <SectionHeader
              title="Principais produtos"
              description="Produtos ordenados por contribuição ao lucro líquido."
            />
            <div className="mt-5 space-y-2">
              {financialState === "ready" && profitabilityQuery.data.products.length > 0 ? (
                profitabilityQuery.data.products.slice(0, 5).map((row) => (
                  <div key={row.productId} className="flex items-center justify-between rounded-[var(--radius-md)] border border-border bg-background-soft px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{row.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.sku ?? "Sem SKU"} · {row.summary.unitsSold} unid.
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{formatMoney(row.summary.netProfit)}</p>
                      <p className="text-xs text-muted-foreground">{formatDecimal(row.summary.grossMarginPercent, "%")} margem</p>
                    </div>
                  </div>
                ))
              ) : (
                <FinancialEmptyState reason={normalizeEmptyStateReason(financialState)} />
              )}
            </div>
          </Card>
        </section>
      )}
    </div>
  );
}
