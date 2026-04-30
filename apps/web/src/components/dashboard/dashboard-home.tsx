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
import { Button, Card } from "@marginflow/ui";
import type {
  DashboardChartsResponse,
  DashboardProfitabilityResponse,
  DashboardRecentSyncResponse,
  DashboardSummaryMetrics,
  DashboardSummaryResponse,
} from "@marginflow/types";
import { ApiClientError, apiClient } from "@/lib/api/client";

const dashboardSummaryQueryKey = ["dashboard-summary"] as const;
const dashboardChartsQueryKey = ["dashboard-charts"] as const;
const dashboardRecentSyncQueryKey = ["dashboard-recent-sync"] as const;
const dashboardProfitabilityQueryKey = ["dashboard-profitability"] as const;

const chartColors = {
  grossRevenue: "#0f766e",
  netProfit: "#0f172a",
  warning: "#b45309",
};

function formatMoney(value: string | number) {
  const numeric = typeof value === "number" ? value : Number(value);

  return Number.isFinite(numeric)
    ? new Intl.NumberFormat("en-US", {
        currency: "USD",
        style: "currency",
      }).format(numeric)
    : String(value);
}

function formatDecimal(value: string | number, suffix = "") {
  const numeric = typeof value === "number" ? value : Number(value);

  return Number.isFinite(numeric)
    ? `${new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0,
      }).format(numeric)}${suffix}`
    : `${String(value)}${suffix}`;
}

function formatMetricDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatProviderLabel(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

async function fetchDashboardSummary(): Promise<DashboardSummaryResponse> {
  const response = await apiClient.get<{ data: DashboardSummaryResponse; error: null }>(
    "/dashboard/summary",
  );

  return response.data;
}

async function fetchDashboardCharts(): Promise<DashboardChartsResponse> {
  const response = await apiClient.get<{ data: DashboardChartsResponse; error: null }>(
    "/dashboard/charts",
  );

  return response.data;
}

async function fetchDashboardRecentSync(): Promise<DashboardRecentSyncResponse> {
  const response = await apiClient.get<{ data: DashboardRecentSyncResponse; error: null }>(
    "/dashboard/recent-sync",
  );

  return response.data;
}

async function fetchDashboardProfitability(): Promise<DashboardProfitabilityResponse> {
  const response = await apiClient.get<{ data: DashboardProfitabilityResponse; error: null }>(
    "/dashboard/profitability",
  );

  return response.data;
}

function BlockShell({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <Card className="space-y-5 border-border bg-surface shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">{eyebrow}</p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="max-w-3xl text-sm leading-7 text-foreground-soft">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

function BlockMessage({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "critical" | "neutral";
}) {
  return (
    <div
      className={
        tone === "critical"
          ? "rounded-[var(--radius-md)] border border-[color:rgba(220,38,38,0.22)] bg-[color:rgba(220,38,38,0.08)] px-4 py-3 text-sm text-foreground"
          : "rounded-[var(--radius-md)] border border-border bg-background-soft px-4 py-3 text-sm leading-7 text-foreground-soft"
      }
    >
      {children}
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

function KpiStrip({ summary }: { summary: DashboardSummaryResponse }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {summary.cards.map((card) => (
        <div
          key={card.label}
          className="relative overflow-hidden rounded-[var(--radius-lg)] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.9))] px-5 py-5"
        >
          <div
            className={
              card.tone === "positive"
                ? "absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#0f766e,#14b8a6)]"
                : card.tone === "warning"
                  ? "absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#b45309,#f59e0b)]"
                  : "absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#0f172a,#475569)]"
            }
          />
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">{card.label}</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
            {formatCardValue(card.label, card.value)}
          </p>
          <p className="mt-3 text-sm leading-7 text-foreground-soft">{card.helperText}</p>
        </div>
      ))}
    </div>
  );
}

function SummaryDetails({ summary }: { summary: DashboardSummaryMetrics }) {
  const detailItems = [
    { label: "Net revenue", value: formatMoney(summary.netRevenue) },
    { label: "Contribution margin", value: formatMoney(summary.contributionMargin) },
    { label: "Total COGS", value: formatMoney(summary.totalCogs) },
    { label: "Marketplace fees", value: formatMoney(summary.totalFees) },
    { label: "Ad costs", value: formatMoney(summary.totalAdCosts) },
    { label: "Manual expenses", value: formatMoney(summary.totalManualExpenses) },
    { label: "Break-even units", value: formatDecimal(summary.breakEvenUnits) },
    { label: "Orders / units", value: `${summary.ordersCount} / ${summary.unitsSold}` },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {detailItems.map((item) => (
        <div key={item.label} className="rounded-[var(--radius-md)] border border-border bg-background-soft px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{item.label}</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function FinancialEmptyState({ reason }: { reason: "catalog" | "insufficient" | "sync" }) {
  if (reason === "sync") {
    return (
      <BlockMessage>
        No marketplace sync has completed yet. Connect Mercado Livre and run the first import from the
        integrations workspace to unlock dashboard trends.
      </BlockMessage>
    );
  }

  if (reason === "catalog") {
    return (
      <BlockMessage>
        Marketplace data exists, but you still need product costs or manual expenses for stronger
        profitability insight. Add those records in Products to deepen the analysis.
      </BlockMessage>
    );
  }

  return (
    <BlockMessage>
      Data exists, but there is not enough signal yet for trend analysis. Keep syncing orders and
      recording costs so MarginFlow can build richer comparisons.
    </BlockMessage>
  );
}

function normalizeEmptyStateReason(
  value: "catalog" | "insufficient" | "sync" | "ready" | null,
): "catalog" | "insufficient" | "sync" {
  if (value === "catalog" || value === "sync") {
    return value;
  }

  return "insufficient";
}

function determineFinancialState(
  summary: DashboardSummaryMetrics | undefined,
  charts: DashboardChartsResponse | undefined,
  profitability: DashboardProfitabilityResponse | undefined,
) {
  if (!summary || !charts || !profitability) {
    return null;
  }

  const hasSyncData = charts.daily.length > 0;
  const hasCatalogCosts =
    Number(summary.totalCogs) > 0 ||
    Number(summary.totalAdCosts) > 0 ||
    Number(summary.totalManualExpenses) > 0;
  const hasProfitabilitySignal =
    profitability.products.length > 0 && profitability.channels.length > 0 && hasCatalogCosts;

  if (!hasSyncData) {
    return "sync" as const;
  }

  if (!hasCatalogCosts) {
    return "catalog" as const;
  }

  if (!hasProfitabilitySignal) {
    return "insufficient" as const;
  }

  return "ready" as const;
}

function CustomChartTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: Array<{ color?: string; name?: string; value?: number | string }>;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-surface px-3 py-3 shadow-[var(--shadow-card)]">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <div className="mt-2 space-y-1">
        {payload.map((entry) => (
          <p key={entry.name} className="text-sm" style={{ color: entry.color ?? "#0f172a" }}>
            {entry.name}: {typeof entry.value === "number" ? formatMoney(entry.value) : entry.value}
          </p>
        ))}
      </div>
    </div>
  );
}

export function DashboardHome({ organizationName }: { organizationName: string }) {
  const summaryQuery = useQuery({
    queryFn: fetchDashboardSummary,
    queryKey: dashboardSummaryQueryKey,
  });
  const chartsQuery = useQuery({
    queryFn: fetchDashboardCharts,
    queryKey: dashboardChartsQueryKey,
  });
  const recentSyncQuery = useQuery({
    queryFn: fetchDashboardRecentSync,
    queryKey: dashboardRecentSyncQueryKey,
  });
  const profitabilityQuery = useQuery({
    queryFn: fetchDashboardProfitability,
    queryKey: dashboardProfitabilityQueryKey,
  });

  const isUnauthorized =
    summaryQuery.error instanceof ApiClientError && summaryQuery.error.status === 401;
  const financialState = determineFinancialState(
    summaryQuery.data?.summary,
    chartsQuery.data,
    profitabilityQuery.data,
  );

  return (
    <main className="space-y-6 py-6 md:py-8">
      <Card className="overflow-hidden border-border bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.18),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] shadow-[var(--shadow-card)]">
        <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">M12 dashboard</p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground">
              Financial insight home for {organizationName}
            </h1>
            <p className="max-w-3xl text-base leading-8 text-foreground-soft">
              MarginFlow now opens with a dedicated financial surface that combines synced marketplace
              orders, mapped product costs, and manual expenses into one profitability view.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/app/integrations">Run sync or review imports</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/app/products">Manage products and costs</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-[var(--radius-lg)] border border-border bg-white/85 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Live backend values</p>
              <p className="mt-2 text-sm leading-7 text-foreground-soft">
                All headline numbers come from backend-owned finance formulas, not duplicated web math.
              </p>
            </div>
            <div className="rounded-[var(--radius-lg)] border border-border bg-white/85 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Sync-aware</p>
              <p className="mt-2 text-sm leading-7 text-foreground-soft">
                Recent provider status stays visible so you can relate insight freshness to the last import.
              </p>
            </div>
            <div className="rounded-[var(--radius-lg)] border border-border bg-white/85 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Built for action</p>
              <p className="mt-2 text-sm leading-7 text-foreground-soft">
                Use the charts for trend reading, then jump into Products or Integrations when the numbers need context.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {isUnauthorized ? (
        <BlockShell
          description="Your session is no longer valid for protected dashboard data."
          eyebrow="Access"
          title="Authentication required"
        >
          <BlockMessage tone="critical">Sign in again and reload the dashboard.</BlockMessage>
        </BlockShell>
      ) : null}

      {!isUnauthorized ? (
        <BlockShell
          description="Track revenue, profitability, margin strength, and break-even posture from the latest backend snapshot."
          eyebrow="Overview"
          title="Top-level KPIs"
        >
          {summaryQuery.isLoading ? <BlockMessage>Loading financial summary...</BlockMessage> : null}
          {summaryQuery.error ? (
            <BlockMessage tone="critical">
              {summaryQuery.error instanceof Error
                ? summaryQuery.error.message
                : "Unexpected dashboard summary error."}
            </BlockMessage>
          ) : null}
          {summaryQuery.data ? (
            <div className="space-y-4">
              <KpiStrip summary={summaryQuery.data} />
              <SummaryDetails summary={summaryQuery.data.summary} />
            </div>
          ) : null}
        </BlockShell>
      ) : null}

      {!isUnauthorized ? (
        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <BlockShell
            description="Daily revenue and net profit trends show whether each sync is pushing the business in the right direction."
            eyebrow="Charts"
            title="Performance trends"
          >
            {chartsQuery.isLoading ? <BlockMessage>Loading chart data...</BlockMessage> : null}
            {chartsQuery.error ? (
              <BlockMessage tone="critical">
                {chartsQuery.error instanceof Error
                  ? chartsQuery.error.message
                  : "Unexpected dashboard chart error."}
              </BlockMessage>
            ) : null}
            {chartsQuery.data ? (
              <>
                {financialState && financialState !== "ready" ? (
                  <FinancialEmptyState reason={financialState} />
                ) : null}
                {chartsQuery.data.daily.length > 0 ? (
                  <div className="grid gap-4">
                    <div className="h-80 rounded-[var(--radius-lg)] border border-border bg-background-soft p-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={chartsQuery.data.daily.map((point) => ({
                            ...point,
                            label: formatMetricDate(point.metricDate),
                          }))}
                          margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.25)" />
                          <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 12 }} tickLine={false} />
                          <YAxis
                            tick={{ fill: "#475569", fontSize: 12 }}
                            tickFormatter={(value) => formatMoney(value)}
                            width={72}
                          />
                          <Tooltip content={<CustomChartTooltip />} />
                          <Line
                            type="monotone"
                            dataKey="grossRevenue"
                            name="Gross revenue"
                            stroke={chartColors.grossRevenue}
                            strokeWidth={3}
                            dot={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="netProfit"
                            name="Net profit"
                            stroke={chartColors.netProfit}
                            strokeWidth={3}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      {chartsQuery.data.daily.slice(-3).reverse().map((point) => (
                        <div
                          key={point.metricDate}
                          className="rounded-[var(--radius-md)] border border-border bg-background-soft px-4 py-4"
                        >
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                            {formatMetricDate(point.metricDate)}
                          </p>
                          <p className="mt-2 text-lg font-semibold text-foreground">
                            {formatMoney(point.netProfit)}
                          </p>
                          <p className="mt-2 text-sm leading-7 text-foreground-soft">
                            Revenue {formatMoney(point.grossRevenue)} with {point.ordersCount} orders.
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </BlockShell>

          <BlockShell
            description="Recent sync availability and the latest Mercado Livre run help explain how fresh the dashboard is."
            eyebrow="Recent sync"
            title="Freshness and availability"
            action={
              <Button asChild variant="secondary">
                <Link href="/app/integrations">Open integrations</Link>
              </Button>
            }
          >
            {recentSyncQuery.isLoading ? <BlockMessage>Loading sync status...</BlockMessage> : null}
            {recentSyncQuery.error ? (
              <BlockMessage tone="critical">
                {recentSyncQuery.error instanceof Error
                  ? recentSyncQuery.error.message
                  : "Unexpected recent sync error."}
              </BlockMessage>
            ) : null}
            {recentSyncQuery.data ? (
              <div className="grid gap-3">
                <div className="rounded-[var(--radius-md)] border border-border bg-background-soft px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Availability</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {recentSyncQuery.data.availability.canRun ? "Available now" : "Blocked"}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-foreground-soft">
                    {recentSyncQuery.data.availability.message}
                  </p>
                </div>
                <div className="rounded-[var(--radius-md)] border border-border bg-background-soft px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Latest completed run</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {formatDateTime(recentSyncQuery.data.lastCompletedRun?.finishedAt ?? null)}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-foreground-soft">
                    {recentSyncQuery.data.lastCompletedRun
                      ? `${recentSyncQuery.data.lastCompletedRun.counts.orders} imported orders and ${recentSyncQuery.data.lastCompletedRun.counts.items} items.`
                      : "No successful sync has been recorded yet."}
                  </p>
                </div>
                <div className="rounded-[var(--radius-md)] border border-border bg-background-soft px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Active provider run</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {recentSyncQuery.data.activeRun?.status ?? "No active run"}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-foreground-soft">
                    {recentSyncQuery.data.activeRun?.startedAt
                      ? `Started ${formatDateTime(recentSyncQuery.data.activeRun.startedAt)}.`
                      : `Current provider: ${formatProviderLabel(recentSyncQuery.data.availability.provider)}.`}
                  </p>
                </div>
              </div>
            ) : null}
          </BlockShell>
        </section>
      ) : null}

      {!isUnauthorized ? (
        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <BlockShell
            description="Channel comparisons show where revenue is concentrating and whether profit is following it."
            eyebrow="Channel view"
            title="Profitability by channel"
          >
            {chartsQuery.isLoading ? <BlockMessage>Loading channel comparison...</BlockMessage> : null}
            {chartsQuery.error ? (
              <BlockMessage tone="critical">
                {chartsQuery.error instanceof Error
                  ? chartsQuery.error.message
                  : "Unexpected channel chart error."}
              </BlockMessage>
            ) : null}
            {chartsQuery.data ? (
              <>
                {financialState === "ready" && chartsQuery.data.channels.length > 0 ? (
                  <div className="h-80 rounded-[var(--radius-lg)] border border-border bg-background-soft p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartsQuery.data.channels} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.25)" />
                        <XAxis
                          dataKey="channel"
                          tick={{ fill: "#475569", fontSize: 12 }}
                          tickFormatter={(value) => formatProviderLabel(String(value))}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: "#475569", fontSize: 12 }}
                          tickFormatter={(value) => formatMoney(value)}
                          width={72}
                        />
                        <Tooltip content={<CustomChartTooltip />} />
                        <Bar dataKey="netProfit" name="Net profit" radius={[8, 8, 0, 0]}>
                          {chartsQuery.data.channels.map((row) => (
                            <Cell
                              key={row.channel}
                              fill={row.netProfit >= 0 ? chartColors.grossRevenue : chartColors.warning}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : null}
                {financialState && financialState !== "ready" ? (
                  <FinancialEmptyState reason={financialState} />
                ) : null}
              </>
            ) : null}
          </BlockShell>

          <BlockShell
            description="Use these tables to spot the products and channels that deserve attention first."
            eyebrow="Profitability tables"
            title="Actionable rankings"
          >
            {profitabilityQuery.isLoading ? <BlockMessage>Loading profitability rankings...</BlockMessage> : null}
            {profitabilityQuery.error ? (
              <BlockMessage tone="critical">
                {profitabilityQuery.error instanceof Error
                  ? profitabilityQuery.error.message
                  : "Unexpected profitability error."}
              </BlockMessage>
            ) : null}
            {profitabilityQuery.data ? (
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-[var(--radius-lg)] border border-border bg-background-soft p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Products</p>
                  {financialState === "ready" && profitabilityQuery.data.products.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {profitabilityQuery.data.products.slice(0, 6).map((row) => (
                        <div key={row.productId} className="rounded-[var(--radius-md)] border border-white/70 bg-white/80 px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{row.productName}</p>
                              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-foreground-soft">
                                {row.sku ?? "No SKU"}
                              </p>
                            </div>
                            <p className="text-sm font-semibold text-foreground">
                              {formatMoney(row.summary.netProfit)}
                            </p>
                          </div>
                          <p className="mt-2 text-sm leading-7 text-foreground-soft">
                            Revenue {formatMoney(row.summary.grossRevenue)} · Margin{" "}
                            {formatDecimal(row.summary.grossMarginPercent, "%")} · Units {row.summary.unitsSold}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4">
                      <FinancialEmptyState reason={normalizeEmptyStateReason(financialState)} />
                    </div>
                  )}
                </div>

                <div className="rounded-[var(--radius-lg)] border border-border bg-background-soft p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Channels</p>
                  {financialState === "ready" && profitabilityQuery.data.channels.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {profitabilityQuery.data.channels.map((row) => (
                        <div key={row.channel} className="rounded-[var(--radius-md)] border border-white/70 bg-white/80 px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {formatProviderLabel(row.channel)}
                              </p>
                              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-foreground-soft">
                                {row.summary.ordersCount} orders
                              </p>
                            </div>
                            <p className="text-sm font-semibold text-foreground">
                              {formatMoney(row.summary.netProfit)}
                            </p>
                          </div>
                          <p className="mt-2 text-sm leading-7 text-foreground-soft">
                            Revenue {formatMoney(row.summary.grossRevenue)} · Fees {formatMoney(row.summary.totalFees)} · Units {row.summary.unitsSold}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4">
                      <FinancialEmptyState reason={normalizeEmptyStateReason(financialState)} />
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </BlockShell>
        </section>
      ) : null}
    </main>
  );
}
