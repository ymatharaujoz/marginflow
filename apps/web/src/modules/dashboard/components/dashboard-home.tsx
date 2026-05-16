"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { RefreshCw, AlertCircle } from "lucide-react";
import { Card, EmptyState, Skeleton, Button } from "@marginflow/ui";
import { ApiClientError } from "@/lib/api/client";
import { containerVariants, fadeInVariants } from "@/lib/animations";
import { SkeletonChart, SkeletonGrid } from "@/components/ui-premium/skeleton-grid";
import { DashboardHeader } from "./dashboard-header";
import { DashboardFinancialIndicators } from "./dashboard-financial-indicators";
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
      <SkeletonGrid rows={1} columns={4} height={120} />
      <Skeleton className="h-12 w-full" />
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
          {isUnauthorized ? "Sessao expirada" : "Erro ao carregar dados"}
        </h3>
        <p className="mb-6 text-sm text-muted-foreground">
          {isUnauthorized
            ? "Sua sessao expirou. Por favor, faca login novamente para continuar."
            : "Nao foi possivel carregar os dados do dashboard. Tente novamente."}
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
    refetchAll,
  } = useDashboardData();

  if (isLoading) {
    return <LoadingDashboard />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetchAll} />;
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-5">
      <DashboardHeader
        organizationName={organizationName}
        businessStatus={businessStatus}
        lastSyncDate={lastSyncDate}
        recentSync={recentSyncQuery.data}
      />

      {profitabilityQuery.data && (
        <section>
          <DashboardFinancialIndicators
            data={profitabilityQuery.data}
            summary={summaryQuery.data ?? undefined}
          />
        </section>
      )}

      {chartsQuery.data && (
        <section className="grid items-stretch gap-4 lg:grid-cols-[1fr_300px]">
          <ChartsSection data={chartsQuery.data} />
          <div className="flex flex-col gap-3">
            <MarketplacesSection data={chartsQuery.data} recentSync={recentSyncQuery.data} />
            {summaryQuery.data && <InsightsSection data={summaryQuery.data} className="flex-1" />}
          </div>
        </section>
      )}

      {profitabilityQuery.data && financialState === "ready" && (
        <motion.section variants={fadeInVariants}>
          <ProductsTable data={profitabilityQuery.data} />
        </motion.section>
      )}

      {financialState === "insufficient" && (
        <motion.div variants={fadeInVariants} initial="hidden" animate="visible">
          <EmptyState
            title="Dados insuficientes para analise completa"
            description="Sua sincronizacao ja trouxe base inicial, mas ainda faltam sinais suficientes para montar rentabilidade por produto."
            action={
              <Button asChild variant="secondary">
                <Link href="/app/products">Revisar catalogo</Link>
              </Button>
            }
          />
        </motion.div>
      )}


    </motion.div>
  );
}
