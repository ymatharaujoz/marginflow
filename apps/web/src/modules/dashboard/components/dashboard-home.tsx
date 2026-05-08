"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { RefreshCw, Plus, AlertCircle, Beaker } from "lucide-react";
import { Card, EmptyState, Skeleton, Button, Badge } from "@marginflow/ui";
import { ApiClientError } from "@/lib/api/client";
import { containerVariants, fadeInVariants } from "@/lib/animations";
import { SkeletonChart, SkeletonGrid } from "@/components/ui-premium/skeleton-grid";
import { DashboardHeader } from "./dashboard-header";
import { KpiCards } from "./kpi-cards";
import { ChartsSection } from "./charts-section";
import { MarketplacesSection } from "./marketplaces-section";
import { InsightsSection } from "./insights-section";
import { ProductsTable } from "./products-table";
import { useDashboardData } from "../hooks/use-dashboard-data";

interface DashboardHomeProps {
  organizationName: string;
}

function LoadingDashboard() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-24 w-full" />
      <SkeletonGrid rows={2} columns={4} height={120} />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <SkeletonChart />
        <SkeletonChart />
      </div>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const isUnauthorized = error instanceof ApiClientError && error.status === 401;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex min-h-[400px] items-center justify-center">
      <Card variant="outlined" className="max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error/10">
          <AlertCircle className="h-6 w-6 text-error" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-foreground">
          {isUnauthorized ? "Sessão expirada" : "Erro ao carregar dados"}
        </h3>
        <p className="mb-6 text-sm text-muted-foreground">
          {isUnauthorized
            ? "Sua sessão expirou. Por favor, faça login novamente para continuar."
            : "Não foi possível carregar os dados do dashboard. Tente novamente."}
        </p>
        {isUnauthorized ? (
          <Button asChild>
            <Link href="/sign-in">Fazer login</Link>
          </Button>
        ) : (
          <Button onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        )}
      </Card>
    </motion.div>
  );
}

function EmptySyncState() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <EmptyState
        title="Ainda sem dados de sincronização"
        description="Conecte o Mercado Livre e execute a primeira importação em Integrações para liberar tendências aqui."
        icon={<span className="text-4xl">📊</span>}
        action={
          <Button asChild size="lg" className="gap-2">
            <Link href="/app/integrations">
              <RefreshCw className="h-4 w-4" />
              Conectar marketplace
            </Link>
          </Button>
        }
      />
    </motion.div>
  );
}

export function DashboardHome({ organizationName }: DashboardHomeProps) {
  const {
    summaryQuery,
    chartsQuery,
    recentSyncQuery,
    profitabilityQuery,
    isLoading,
    error,
    financialState,
    businessStatus,
    lastSyncDate,
    isUsingMockData,
    refetchAll,
  } = useDashboardData();

  if (isLoading) {
    return <LoadingDashboard />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetchAll} />;
  }

  if (financialState === "sync") {
    return <EmptySyncState />;
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-5">
      {isUsingMockData && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Beaker className="h-4 w-4 text-warning" />
              <span className="text-sm font-medium text-foreground">Modo de demonstração ativo</span>
              <Badge variant="warning" className="text-[10px]">
                Dados de teste
              </Badge>
            </div>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Remova NEXT_PUBLIC_USE_MOCK_DATA do .env.local para dados reais
            </p>
          </div>
        </motion.div>
      )}

      <DashboardHeader
        organizationName={organizationName}
        businessStatus={businessStatus}
        lastSyncDate={lastSyncDate}
      />

      {summaryQuery.data && (
        <section>
          <KpiCards data={summaryQuery.data} />
        </section>
      )}

      {chartsQuery.data && (
        <section className="grid items-start gap-4 lg:grid-cols-[1fr_300px]">
          <ChartsSection data={chartsQuery.data} />
          <div className="space-y-3">
            <MarketplacesSection data={chartsQuery.data} />
            {summaryQuery.data && <InsightsSection data={summaryQuery.data} />}
          </div>
        </section>
      )}

      {profitabilityQuery.data && financialState === "ready" && (
        <motion.section variants={fadeInVariants}>
          <ProductsTable data={profitabilityQuery.data} />
        </motion.section>
      )}

      {financialState === "catalog" && summaryQuery.data && (
        <motion.div variants={fadeInVariants} initial="hidden" animate="visible">
          <Card variant="outlined" className="border-warning/20 bg-warning-soft/30 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Cadastre custos de produto</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Há dados de marketplace, mas faltam custos para enxergar lucratividade completa.
                </p>
              </div>
              <Button asChild variant="secondary" className="gap-2">
                <Link href="/app/products">
                  <Plus className="h-4 w-4" />
                  Adicionar custos
                </Link>
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {financialState === "insufficient" && (
        <motion.div variants={fadeInVariants} initial="hidden" animate="visible">
          <EmptyState
            title="Dados insuficientes para análise completa"
            description="Sua sincronização já trouxe base inicial, mas ainda faltam sinais suficientes para montar rentabilidade por produto."
            action={
              <Button asChild variant="secondary">
                <Link href="/app/products">Revisar catálogo</Link>
              </Button>
            }
          />
        </motion.div>
      )}

      {recentSyncQuery.data?.availability?.message && (
        <p className="text-xs text-muted-foreground">{recentSyncQuery.data.availability.message}</p>
      )}
    </motion.div>
  );
}
