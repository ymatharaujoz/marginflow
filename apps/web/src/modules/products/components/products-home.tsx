"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { RefreshCw, Plus, AlertCircle, Package } from "lucide-react";
import { Card, EmptyState, Skeleton, Button } from "@marginflow/ui";
import { ApiClientError } from "@/lib/api/client";
import { containerVariants, fadeInVariants } from "@/lib/animations";
import { SkeletonGrid } from "@/components/ui-premium/skeleton-grid";
import { ProductHeader } from "./product-header";
import { ProductFinancialIndicators } from "./product-financial-indicators";
import { ProductInsights } from "./product-insights";
import { ProductTable } from "./product-table";
import {
  formatReferenceMonthPtBr,
  useProductData,
} from "../hooks/use-product-data";
import { buildProductCoverageNote } from "../calculations/product-insights";
import type { CatalogStats, ProductInsight } from "../types/products";

interface ProductsHomeProps {
  organizationName: string;
  onAddProduct?: () => void;
  onInsightAction?: (insight: ProductInsight) => boolean | void;
}

function LoadingState() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-24 w-full" />
      <SkeletonGrid rows={2} columns={4} height={80} />
      <Skeleton className="h-[170px] w-full rounded-[var(--radius-lg)]" />
      <Skeleton className="h-[440px] w-full rounded-[var(--radius-lg)]" />
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const isUnauthorized = error instanceof ApiClientError && error.status === 401;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex min-h-[400px] items-center justify-center"
    >
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
            : "Não foi possível carregar o catálogo de produtos. Tente novamente."}
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

function EmptyCatalogState({ onAdd }: { onAdd?: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <ProductHeader organizationName="Sua organização" stats={null} />

      <EmptyState
        title="Catálogo vazio"
        description="Comece criando seu primeiro produto para gerenciar custos, margens e lucratividade."
        icon={<span className="text-4xl">📦</span>}
        action={
          <Button size="lg" className="gap-2" onClick={onAdd}>
            <Plus className="h-4 w-4" />
            Criar primeiro produto
          </Button>
        }
      />
    </motion.div>
  );
}

function NoCostsState({ stats, onAdd }: { stats: CatalogStats } & { onAdd?: () => void }) {
  return (
    <motion.div variants={fadeInVariants} initial="hidden" animate="visible" className="space-y-6">
      <ProductHeader organizationName="Sua organização" stats={stats} />

      <Card variant="outlined" className="border-warning/20 bg-warning-soft/30 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/10">
              <Package className="h-5 w-5 text-warning" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Cadastre custos de produto</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Você tem {stats.totalProducts} produto{stats.totalProducts > 1 ? "s" : ""} mas nenhum
                custo registrado. Os custos são essenciais para calcular margens e lucratividade.
              </p>
            </div>
          </div>
          <Button variant="secondary" className="gap-2 shrink-0" onClick={onAdd}>
            <Plus className="h-4 w-4" />
            Adicionar custo
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

function ReferenceMonthToolbar({
  options,
  referenceMonth,
  onReferenceMonthChange,
}: {
  options: readonly string[];
  referenceMonth: string;
  onReferenceMonthChange: (isoDay: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-strong px-3 py-2 shadow-sm">
      <span className="text-xs font-semibold uppercase tracking-wider text-accent">Mês</span>
      <select
        className="h-7 rounded-md border-0 bg-transparent px-2 text-sm font-semibold text-foreground hover:bg-accent/5 focus:outline-none focus:ring-2 focus:ring-accent/20 cursor-pointer"
        onChange={(event) => onReferenceMonthChange(event.target.value)}
        value={referenceMonth}
      >
        {options.map((iso) => (
          <option key={iso} value={iso}>
            {formatReferenceMonthPtBr(iso)}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ProductsHome({
  organizationName,
  onAddProduct,
  onInsightAction,
}: ProductsHomeProps) {
  const {
    data,
    referenceMonth,
    referenceMonthSelectOptions,
    stats,
    insights,
    rows,
    pagination,
    financialState,
    isLoading,
    error,
    isUnauthorized,
    setReferenceMonth,
    refetch,
    goToPage,
  } = useProductData();
  const coverageNote = buildProductCoverageNote(data);

  if (isLoading) {
    return <LoadingState />;
  }

  if (error && !isUnauthorized) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  const monthToolbar = (
    <ReferenceMonthToolbar
      onReferenceMonthChange={setReferenceMonth}
      options={referenceMonthSelectOptions}
      referenceMonth={referenceMonth}
    />
  );

  if (financialState === "empty") {
    return (
      <motion.div variants={fadeInVariants} initial="hidden" animate="visible" className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <ProductHeader organizationName={organizationName} stats={stats} />
          {monthToolbar}
        </div>
        <EmptyCatalogState onAdd={onAddProduct} />
      </motion.div>
    );
  }

  if (financialState === "no-costs" && stats) {
    return (
      <motion.div variants={fadeInVariants} initial="hidden" animate="visible" className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <ProductHeader organizationName={organizationName} stats={stats} />
          {monthToolbar}
        </div>
        <NoCostsState stats={stats} onAdd={onAddProduct} />
      </motion.div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <ProductHeader organizationName={organizationName} stats={stats} />
        {monthToolbar}
      </div>

      <ProductFinancialIndicators rows={rows} />

      {coverageNote ? (
        <Card variant="outlined" className="border-info/20 bg-info/5 p-4">
          <p className="text-sm text-muted-foreground">{coverageNote}</p>
        </Card>
      ) : null}

      <ProductInsights insights={insights} onInsightAction={onInsightAction} />

      <section className="min-w-0 w-full">
        <ProductTable rows={rows} pagination={pagination} onPageChange={goToPage} />
      </section>
    </motion.div>
  );
}
