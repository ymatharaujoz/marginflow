"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, AlertCircle } from "lucide-react";
import type { Company, IntegrationProviderSlug } from "@lucreii/types";
import { Card, EmptyState, Skeleton, Button } from "@lucreii/ui";
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
import { useDashboardConnectionStatuses } from "../hooks/use-dashboard-connection-statuses";

interface DashboardHomeProps {
  activeCompany: Company | null;
  companyName: string;
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

export function DashboardHome({ activeCompany, companyName }: DashboardHomeProps) {
  const [providerFilter, setProviderFilter] = useState<IntegrationProviderSlug | null>(null);
  const {
    summaryQuery,
    chartsQuery,
    profitabilityQuery,
    isLoading,
    error,
    financialState,
    businessStatus,
    refetchAll,
  } = useDashboardData(providerFilter);
  const { syncStatusByProvider } = useDashboardConnectionStatuses();

  if (isLoading) {
    return <LoadingDashboard />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetchAll} />;
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-5">
      <DashboardHeader
        companyName={companyName}
        businessStatus={businessStatus}
      />

      <hr className="border-border" />

      <div className="flex w-fit rounded-lg border border-border bg-surface-strong p-1">
        {([
          [null, "Todos"],
          ["mercadolivre", "Mercado Livre"],
          ["shopee", "Shopee"],
          ["shein", "Shein"],
        ] as const).map(([provider, label]) => (
          <button
            key={provider ?? "all"}
            type="button"
            onClick={() => setProviderFilter(provider)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              providerFilter === provider
                ? "bg-accent text-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {profitabilityQuery.data && (
        <section>
          <DashboardFinancialIndicators
            activeCompany={activeCompany}
            data={profitabilityQuery.data}
            summary={summaryQuery.data ?? undefined}
          />
        </section>
      )}

      {chartsQuery.data && (
        <section className="grid items-stretch gap-4 lg:grid-cols-[1fr_300px]">
          <ChartsSection data={chartsQuery.data} className="h-full" />
          <div className="flex h-full flex-col gap-3">
            <MarketplacesSection
              data={chartsQuery.data}
              syncStatusByProvider={syncStatusByProvider}
              className={summaryQuery.data ? "" : "flex-1"}
            />
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
            title="Dados insuficientes para análise completa"
            description="Sua sincronização já trouxe a base inicial, mas ainda faltam sinais suficientes para montar a rentabilidade por produto."
            action={
              <Button asChild variant="secondary">
                <Link href="/app/products">Revisar catálogo</Link>
              </Button>
            }
          />
        </motion.div>
      )}
    </motion.div>
  );
}
