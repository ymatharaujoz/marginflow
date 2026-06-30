"use client";

import Link from "next/link";
import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  RefreshCw,
  Plus,
  Upload,
  Download,
  AlertCircle,
  AlertTriangle,
  Package,
  Box,
  DollarSign,
  BarChart3,
  Sparkles,
  ArrowRight,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  Store,
  X,
  Trash2,
  CheckCheck,
} from "lucide-react";
import {
  Card,
  Skeleton,
  Button,
  Badge,
  EmptyState,
  Dropdown,
  Modal,
  cn,
} from "@lucreii/ui";
import type { ProductListItem } from "@lucreii/types";
import { CurrencyInput, parseCurrencyValue } from "./currency-input";
import { ApiClientError, apiClient } from "@/lib/api/client";
import { containerVariants, fadeInVariants } from "@/lib/animations";
import { SkeletonGrid } from "@/components/ui-premium/skeleton-grid";
import { Pagination } from "@/components/ui-premium/pagination";
import { ProductHeader } from "./product-header";

import { ProductTable } from "./product-table";
import {
  formatReferenceMonthPtBr,
  useProductData,
} from "../hooks/use-product-data";
import { useProductPerformancePage } from "../hooks/use-product-performance-data";
import { buildMarketplaceSyncNotice } from "../calculations/product-insights";
import { formatMoney } from "../utils/formatters";
import type { ProductMarketplaceNotice } from "../types/products";

interface ProductsHomeProps {
  view?: "catalog" | "performance";
  onAddProduct?: (context: {
    companyId: string | null;
    referenceMonth: string;
  }) => void;
  onImportProducts?: () => void;
}

type PerformanceSortKey =
  | "channelLabel"
  | "parentName"
  | "variationName"
  | "sales"
  | "sellingPrice"
  | "contributionMarginRatio"
  | "totalProfit";

function LoadingState() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-24 w-full" />
      <SkeletonGrid rows={1} columns={1} height={80} />
      <Skeleton className="h-[440px] w-full rounded-[var(--radius-lg)]" />
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const isUnauthorized =
    error instanceof ApiClientError && error.status === 401;

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

const emptyCatalogBenefits = [
  {
    icon: Box,
    title: "Catálogo centralizado",
    description: "Gerencie todos os seus produtos em um só lugar.",
  },
  {
    icon: DollarSign,
    title: "Controle de custos",
    description: "Registre custos e calcule margens reais.",
  },
  {
    icon: BarChart3,
    title: "Análise de lucratividade",
    description: "Descubra quais produtos trazem mais resultado.",
  },
];

function EmptyCatalogState({
  onAdd,
  onImport,
}: {
  onAdd?: () => void;
  onImport?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <Card
        variant="outlined"
        className="relative overflow-hidden border-border/60 bg-surface-strong/20 px-6 py-12 text-center sm:px-10 sm:py-16"
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent/40 via-accent to-accent/40" />

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent shadow-sm ring-1 ring-accent/10">
          <Package className="h-8 w-8" />
        </div>

        <h2 className="mt-6 text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
          Construa seu catálogo
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          Cadastre ou importe seu primeiro produto para começar a controlar custos, margens e lucratividade real de cada item.
        </p>

        <div className="mx-auto mt-8 grid max-w-lg gap-3 sm:grid-cols-3">
          {emptyCatalogBenefits.map((benefit) => (
            <div
              key={benefit.title}
              className="flex flex-col items-center rounded-xl border border-border bg-surface p-4 text-center shadow-[var(--shadow-xs)] transition-all hover:border-accent/20 hover:shadow-sm"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <benefit.icon className="h-4 w-4" />
              </div>
              <h4 className="mt-2 text-xs font-semibold text-foreground">
                {benefit.title}
              </h4>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <Button size="lg" className="gap-2 px-6 text-sm" onClick={onAdd}>
              <Plus className="h-4 w-4" />
              Criar primeiro produto
              <ArrowRight className="h-4 w-4 opacity-70" />
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="gap-2 px-6 text-sm"
              onClick={onImport}
            >
              <Upload className="h-4 w-4" />
              Importar produtos
            </Button>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 text-accent" />
            Leva menos de 5 minutos.
          </p>
        </div>
      </Card>
    </motion.div>
  );
}

function NoCostsState() {
  return (
    <motion.div variants={fadeInVariants} initial="hidden" animate="visible">
      <Card
        variant="outlined"
        className="border-warning/20 bg-warning-soft/30 p-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/10">
              <Package className="h-5 w-5 text-warning" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Cadastre custos de produto
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Você tem produtos sem custo cadastrado. Os custos são
                essencias para calcular margens e lucratividade.
              </p>
            </div>
          </div>
          <Button asChild variant="secondary" className="gap-2 shrink-0">
            <Link href="/app/products/catalog">
              <ArrowRight className="h-4 w-4" />
              Ir para catálogo
            </Link>
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

function MarketplaceNoticeCard({
  notice,
}: {
  notice: ProductMarketplaceNotice;
}) {
  const toneClasses =
    notice.tone === "alert"
      ? "border-warning/30 bg-warning-soft/30"
      : notice.tone === "success"
        ? "border-emerald-500/25 bg-emerald-500/8"
        : "border-info/20 bg-info/5";

  return (
    <Card variant="outlined" className={`p-5 ${toneClasses}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">
            {notice.title}
          </h3>
          <p className="text-sm text-muted-foreground">{notice.description}</p>
        </div>
        {notice.actionLabel && notice.href ? (
          <Button asChild variant="secondary" className="shrink-0">
            <Link href={notice.href}>{notice.actionLabel}</Link>
          </Button>
        ) : null}
      </div>
    </Card>
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
  const items = options.map((iso) => ({
    id: iso,
    label: formatReferenceMonthPtBr(iso),
  }));

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-strong px-3 py-2 shadow-sm">
      <span className="text-xs font-semibold uppercase tracking-wider text-accent">
        Mês
      </span>
      <Dropdown
        align="left"
        items={items}
        onSelect={(id) => onReferenceMonthChange(id)}
        trigger={
          <div className="flex h-7 items-center gap-1.5 rounded-md bg-surface px-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent/5">
            {formatReferenceMonthPtBr(referenceMonth)}
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        }
      />
    </div>
  );
}

function formatProductDate(dateIso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
  }).format(new Date(dateIso));
}

type CatalogFinanceFormValues = {
  packagingCost: string;
  unitCost: string;
};

function buildCatalogFinanceForm(product: ProductListItem): CatalogFinanceFormValues {
  return {
    packagingCost: product.financeDefaults?.packagingCost ?? "",
    unitCost: product.latestCost?.amount ?? "",
  };
}

function readCatalogFinanceFormValues(
  formElement: HTMLFormElement,
): CatalogFinanceFormValues {
  const formData = new FormData(formElement);

  return {
    packagingCost: parseCurrencyValue(
      String(formData.get("packagingCost") ?? "").trim(),
    ),
    unitCost: parseCurrencyValue(String(formData.get("unitCost") ?? "").trim()),
  };
}

function ProductImagePreview({
  alt,
  className,
  url,
}: {
  alt: string;
  className: string;
  url: string | null;
}) {
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <div
        aria-label={`Sem foto para ${alt}`}
        className={`flex items-center justify-center bg-surface-strong text-muted-foreground ${className}`}
      >
        <Package className="h-5 w-5" />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-surface-strong ${className}`}>
      <Image
        alt={alt}
        className="object-cover"
        fill
        onError={() => setFailed(true)}
        sizes="(max-width: 640px) 80px, 160px"
        src={url}
      />
    </div>
  );
}

function CatalogProductDetailsModal({
  onClose,
  onDeleted,
  onSaved,
  product,
}: {
  onClose: () => void;
  onDeleted: () => Promise<unknown> | unknown;
  onSaved: () => Promise<unknown> | unknown;
  product: ProductListItem | null;
}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState<CatalogFinanceFormValues>({
    packagingCost: "",
    unitCost: "",
  });
  const [heroFailed, setHeroFailed] = useState(false);

  useEffect(() => {
    if (!product) {
      setForm({ packagingCost: "", unitCost: "" });
      setErrorMessage(null);
      return;
    }

    setForm(buildCatalogFinanceForm(product));
    setErrorMessage(null);
  }, [product]);

  const images = product?.images ?? [];
  const firstImage = images[0] ?? null;

  useEffect(() => {
    setHeroFailed(false);
  }, [firstImage?.url]);

  const saveMutation = useMutation({
    mutationFn: async (values: CatalogFinanceFormValues) => {
      if (!product) {
        throw new Error("Produto não encontrado.");
      }

      return apiClient.patch<{ data: ProductListItem; error: null }>(
        `/products/${product.id}/catalog-finance`,
        {
          body: {
            packagingCost: values.packagingCost,
            unitCost: values.unitCost,
          },
        },
      );
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof ApiClientError
          ? error.message
          : "Não foi possível salvar os dados financeiros do produto.",
      );
    },
    onSuccess: async () => {
      setErrorMessage(null);
      await onSaved();
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!product) {
        throw new Error("Produto não encontrado.");
      }

      return apiClient.delete<{ data: { id: string }; error: null }>(
        `/products/${product.id}`,
      );
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof ApiClientError
          ? error.message
          : "Não foi possível excluir o produto.",
      );
    },
    onSuccess: async () => {
      setErrorMessage(null);
      await onDeleted();
      onClose();
    },
  });

  const isSyntheticParent = product?.isSyntheticParent ?? false;

  return (
      <Modal
        className="w-[94vw] max-w-5xl"
        onClose={onClose}
        open={product !== null}
        title={
          product ? (
            <div>
              <h2 className="text-lg font-semibold text-foreground leading-tight">
                {product.name}
              </h2>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-muted-foreground/60">
                  SKU: {product.sku ?? "—"}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                    product.isActive
                      ? "bg-emerald-500/10 text-emerald-600 ring-1 ring-inset ring-emerald-500/20"
                      : "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
                  )}
                >
                  {product.isActive ? "Ativo" : "Arquivado"}
                </span>
              </div>
            </div>
          ) : (
            "Produto"
          )
        }
      >
      {product ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="flex flex-col"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (saveMutation.isPending || deleteMutation.isPending) return;
              const nextForm = readCatalogFinanceFormValues(e.currentTarget);
              setForm(nextForm);
              saveMutation.mutate(nextForm);
            }}
            className="flex flex-col gap-6"
          >
            {/* Imagem hero — centralizado */}
            <div className="mx-auto w-full max-w-[320px]">
              <div className="relative mb-4 aspect-[4/3] overflow-hidden rounded-[var(--radius-xl)] border border-border/60 bg-gradient-to-br from-surface-strong via-surface to-background shadow-[var(--shadow-md)]">
                {firstImage && !heroFailed ? (
                  <Image
                    alt={product.name}
                    className="object-cover"
                    fill
                    onError={() => setHeroFailed(true)}
                    sizes="320px"
                    src={firstImage.url}
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Package className="h-10 w-10" />
                    <span className="text-xs">Sem foto</span>
                  </div>
                )}
              </div>
            </div>

            {/* Seção financeira */}
            <div className="rounded-[var(--radius-xl)] border border-border/30 bg-gradient-to-br from-surface/80 via-surface-strong/30 to-background/10 p-5 shadow-[var(--shadow-sm)]">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] bg-accent/10 ring-1 ring-accent/20">
                  <DollarSign className="h-4 w-4 text-accent" />
                </div>
                <div>
                  {isSyntheticParent ? (
                    <p className="text-[11px] text-muted-foreground/70">
                      Pai lógico do anúncio. Edite custos apenas nas variações vinculadas.
                    </p>
                  ) : null}
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-accent">
                    Informações Financeiras
                  </h3>
                  <p className="text-[11px] text-muted-foreground/70">
                    {product.catalogRole === "parent"
                      ? "Salvar aqui sobrescreve custo e embalagem de todas as variações."
                      : product.catalogRole === "child"
                        ? "Salvar aqui altera apenas esta variação."
                        : "Preencha os custos do produto"}
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    className="text-xs font-medium text-muted-foreground"
                    htmlFor="catalog-unit-cost"
                  >
                    Custo Unitário <span className="text-error">*</span>
                  </label>
                  <div className="mt-2">
                    <CurrencyInput
                      disabled={isSyntheticParent}
                      id="catalog-unit-cost"
                      name="unitCost"
                      onChange={(val) =>
                        setForm((curr) => ({ ...curr, unitCost: val }))
                      }
                      placeholder="0,00"
                      required
                      value={form.unitCost}
                    />
                  </div>
                </div>
                <div>
                  <label
                    className="text-xs font-medium text-muted-foreground"
                    htmlFor="catalog-packaging-cost"
                  >
                    Embalagem <span className="text-error">*</span>
                  </label>
                  <div className="mt-2">
                    <CurrencyInput
                      disabled={isSyntheticParent}
                      id="catalog-packaging-cost"
                      name="packagingCost"
                      onChange={(val) =>
                        setForm((curr) => ({ ...curr, packagingCost: val }))
                      }
                      placeholder="0,00"
                      required
                      value={form.packagingCost}
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label
                    className="text-xs font-medium text-muted-foreground"
                    htmlFor="catalog-selling-price"
                  >
                    Preço de Venda
                  </label>
                  <div className="mt-2">
                    <CurrencyInput
                      id="catalog-selling-price"
                      name="sellingPrice"
                      disabled
                      onChange={() => {}}
                      placeholder="0,00"
                      value={String(product.sellingPrice ?? "")}
                    />
                  </div>
                </div>
              </div>
            </div>

            {errorMessage ? (
              <div className="rounded-[var(--radius-md)] border border-error/30 bg-error/10 px-3 py-2.5 text-sm text-error">
                {errorMessage}
              </div>
            ) : null}

            {/* Barra de ações */}
            <div className="mt-2 flex items-center justify-between gap-3 border-t border-border/30 pt-6">
              {!isSyntheticParent && (
              <Button
                loading={deleteMutation.isPending}
                onClick={() => {
                  if (!window.confirm("Excluir este produto do catálogo?")) {
                    return;
                  }
                  deleteMutation.mutate();
                }}
                type="button"
                variant="danger"
                disabled={saveMutation.isPending || deleteMutation.isPending}
              >
                Excluir produto
              </Button>
              )}
              <Button
                type="submit"
                className="px-6"
                disabled={isSyntheticParent || saveMutation.isPending || deleteMutation.isPending}
                loading={saveMutation.isPending}
              >
                Salvar
              </Button>
            </div>
          </form>
        </motion.div>
      ) : null}
    </Modal>
  );
}

function CatalogProductsTable({
  onRefresh,
  products,
}: {
  onRefresh: () => Promise<unknown> | unknown;
  products: ReturnType<typeof useProductData>["products"];
}) {
  const [selectedProduct, setSelectedProduct] =
    useState<ProductListItem | null>(null);
  if (products.length === 0) {
    return (
      <Card padding="lg">
        <EmptyState
          title="Nenhum produto cadastrado"
          description="Cadastre um produto manual para iniciar seu catálogo."
          icon={<Package className="h-6 w-6" />}
        />
      </Card>
    );
  }

  return (
    <>
      <Card padding="lg" className="flex h-full flex-col overflow-hidden">
        <div className="mb-4 shrink-0">
          <h3 className="text-sm font-semibold text-foreground">
            Produtos do catálogo
          </h3>
          <p className="text-xs text-muted-foreground">
            Itens cadastrados manualmente ou importados
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="overflow-auto h-full">
            <table className="w-full min-w-[1100px] border-separate border-spacing-0">
              <thead>
                <tr className="border-b border-border bg-surface-strong/95">
                  <th className="sticky top-0 z-10 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Produto
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    SKU
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    PDV
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Custo unitário
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Embalagem
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
            <tbody>
              {products.map((product) => (
                <tr
                  className="cursor-pointer border-b border-border/50 hover:bg-surface-strong/30"
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                >
                  <td className="px-3 py-3 text-sm font-medium text-foreground">
                    <div className="flex items-center gap-3">
                      <ProductImagePreview
                        alt={product.name}
                        className="h-10 w-10 shrink-0 rounded-[var(--radius-md)]"
                        url={product.coverImageUrl}
                      />
                      <span className="flex items-center gap-2">
                        <span>{product.name}</span>
                        {product.latestCost ? null : (
                          <span
                            aria-label="Produto sem custos cadastrados"
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-warning/10 text-warning"
                            title="Produto sem custos cadastrados"
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-sm text-muted-foreground">
                    {product.sku ?? "Sem SKU"}
                  </td>
                  <td className="px-3 py-3 text-right text-sm text-foreground">
                    {formatMoney(Number(product.sellingPrice))}
                  </td>
                  <td className="px-3 py-3 text-right text-sm text-foreground">
                    {product.latestCost
                      ? formatMoney(Number(product.latestCost.amount))
                      : "—"}
                  </td>
                  <td className="px-3 py-3 text-right text-sm text-foreground">
                    {product.financeDefaults
                      ? formatMoney(Number(product.financeDefaults.packagingCost))
                      : "—"}
                  </td>
                  <td className="px-3 py-3 text-left">
                    <Badge
                      variant={product.isActive ? "success" : "neutral"}
                      className="gap-1.5"
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${product.isActive ? "bg-success" : "bg-muted"}`}
                      />
                      {product.isActive ? "Ativo" : "Arquivado"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </Card>
      <CatalogProductDetailsModal 
        onDeleted={onRefresh} 
        onClose={() => setSelectedProduct(null)} 
        onSaved={onRefresh} 
        product={selectedProduct} 
      /> 
    </>
  );
}

const CATALOG_PAGE_SIZE = 10;

type CatalogSortKey =
  | "name"
  | "sku"
  | "sellingPrice"
  | "unitCost"
  | "packagingCost"
  | "isActive"
  | "createdAt"
  | "channel";

type CatalogSortDirection = "asc" | "desc" | null;

const catalogMarketplaceOptions = [
  { value: "mercadolivre", label: "MELI" },
  { value: "shopee", label: "Shopee" },
  { value: "shein", label: "Shein" },
];

function getChannelBadge(channel: string | null) {
  const normalized = (channel ?? "manual").trim().toLowerCase();

  if (normalized === "mercadolivre") {
    return (
      <Badge
        className="border-transparent"
        style={{ backgroundColor: "#ffe600", color: "#000000" }}
      >
        MELI
      </Badge>
    );
  }

  if (normalized === "shopee") {
    return (
      <Badge
        className="border-transparent"
        style={{ backgroundColor: "#fa5230", color: "#ffffff" }}
      >
        Shopee
      </Badge>
    );
  }

  if (normalized === "shein") {
    return (
      <Badge
        className="border-transparent"
        style={{ backgroundColor: "#111111", color: "#ffffff" }}
      >
        Shein
      </Badge>
    );
  }

  return <Badge variant="neutral">Manual</Badge>;
}

function getCatalogSortValue(
  product: ProductListItem,
  key: CatalogSortKey,
): string | number | boolean | null {
  switch (key) {
    case "name":
      return product.name;
    case "sku":
      return product.sku ?? null;
    case "sellingPrice":
      return Number(product.sellingPrice);
    case "unitCost":
      return product.latestCost ? Number(product.latestCost.amount) : null;
    case "packagingCost":
      return product.financeDefaults ? Number(product.financeDefaults.packagingCost) : null;
    case "isActive":
      return product.isActive;
    case "createdAt":
      return product.createdAt;
    case "channel":
      return product.derivedFromProvider ?? "manual";
    default:
      return null;
  }
}

function compareCatalogSortValues(
  a: string | number | boolean | null,
  b: string | number | boolean | null,
  direction: "asc" | "desc",
): number {
  const aNull = a === null || a === undefined || (typeof a === "number" && !Number.isFinite(a));
  const bNull = b === null || b === undefined || (typeof b === "number" && !Number.isFinite(b));
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;
  if (typeof a === "boolean" && typeof b === "boolean") {
    return direction === "asc" ? (a === b ? 0 : a ? -1 : 1) : (a === b ? 0 : a ? 1 : -1);
  }
  if (typeof a === "string" && typeof b === "string") {
    return direction === "asc" ? a.localeCompare(b) : b.localeCompare(a);
  }
  const an = Number(a);
  const bn = Number(b);
  return direction === "asc" ? an - bn : bn - an;
}

function CatalogSelectionActionBar({
  allVisibleSelected,
  isDeleting,
  isExporting,
  onClearSelection,
  onDeleteSelected,
  onExportSelected,
  onSelectAllVisible,
  selectedCount,
  selectedTotalValue,
  visibleCount,
}: {
  allVisibleSelected: boolean;
  isDeleting: boolean;
  isExporting: boolean;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  onExportSelected: () => void;
  onSelectAllVisible: () => void;
  selectedCount: number;
  selectedTotalValue: number;
  visibleCount: number;
}) {
  return (
    <AnimatePresence initial={false} mode="wait">
      {selectedCount > 0 ? (
        <motion.div
          key="catalog-selection-bar"
          initial={{ opacity: 0, y: -8, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.985 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="group relative mb-4 flex shrink-0 flex-col gap-3 overflow-hidden rounded-[var(--radius-lg)] border border-accent/25 bg-gradient-to-r from-accent/[0.07] via-accent/[0.04] to-transparent p-3 pl-4 shadow-[0_1px_0_0_rgba(255,255,255,0.6)_inset,var(--shadow-sm)] backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:pl-5 dark:from-accent/[0.12] dark:via-accent/[0.06] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,var(--shadow-sm)]"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-accent via-accent-strong to-accent"
          />

          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-accent/10 text-accent ring-1 ring-inset ring-accent/20">
              <Sparkles className="h-4.5 w-4.5" strokeWidth={2.25} />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent ring-2 ring-background">
                <span className="absolute inset-0 animate-ping rounded-full bg-accent/60" />
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1.5 text-sm text-foreground">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Seleção
                </span>
                <span className="text-muted-foreground/40">·</span>
                <div className="flex items-baseline gap-1">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={selectedCount}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="font-mono text-base font-bold tabular-nums text-accent"
                    >
                      {selectedCount}
                    </motion.span>
                  </AnimatePresence>
                  <span className="font-medium text-foreground">
                    {selectedCount === 1 ? "selecionado" : "selecionados"}
                  </span>
                </div>
              </div>
              {selectedTotalValue > 0 ? null : (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Pronto para ação em massa
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap sm:gap-2">
            {visibleCount > 0 && !allVisibleSelected ? (
              <Button
                className="h-8 gap-1.5 rounded-[var(--radius-sm)] px-2.5 text-xs font-medium text-muted-foreground hover:bg-accent/10 hover:text-accent"
                onClick={onSelectAllVisible}
                size="sm"
                variant="ghost"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Selecionar página
              </Button>
            ) : null}

            <Button
              aria-label="Limpar seleção"
              className="h-8 gap-1.5 rounded-[var(--radius-sm)] px-2.5 text-xs font-medium text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
              onClick={onClearSelection}
              size="sm"
              variant="ghost"
            >
              <X className="h-3.5 w-3.5" />
              Limpar
            </Button>

            <div className="mx-1 hidden h-5 w-px bg-border/70 sm:block" />

            <Button
              className="h-8 gap-1.5 rounded-[var(--radius-sm)] bg-accent/95 px-3 text-xs font-semibold text-accent-foreground shadow-[0_1px_0_0_rgba(255,255,255,0.25)_inset,var(--shadow-xs)] hover:bg-accent hover:shadow-[var(--shadow-sm)]"
              disabled={isExporting}
              loading={isExporting}
              onClick={onExportSelected}
              size="sm"
            >
              {!isExporting ? <Download className="h-3.5 w-3.5" /> : null}
              Exportar selecionados
            </Button>

            <Button
              className="h-8 gap-1.5 rounded-[var(--radius-sm)] border border-error/30 bg-error/10 px-3 text-xs font-semibold text-error shadow-[var(--shadow-xs)] hover:border-error/50 hover:bg-error hover:text-white"
              disabled={isDeleting}
              loading={isDeleting}
              onClick={onDeleteSelected}
              size="sm"
            >
              {!isDeleting ? <Trash2 className="h-3.5 w-3.5" /> : null}
              Excluir selecionados
            </Button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function CatalogProductsHierarchyTable({ 
  onRefresh, 
  products, 
}: { 
  onRefresh: () => Promise<unknown> | unknown; 
  products: ReturnType<typeof useProductData>["products"]; 
}) {  
  const [expandedParentIds, setExpandedParentIds] = useState<string[]>([]);  
  const [selectedProduct, setSelectedProduct] =  
    useState<ProductListItem | null>(null);  
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
 
  const [sortConfig, setSortConfig] = useState<{ 
    key: CatalogSortKey; 
    direction: CatalogSortDirection; 
  } | null>(null); 
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false); 
  const [currentPage, setCurrentPage] = useState(1); 
  const [isExporting, setIsExporting] = useState(false); 

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) =>
      apiClient.delete<{
        data: { ids: string[]; totalDeleted: number };
        error: null;
      }>("/products/bulk-delete", {
        body: { ids },
      }),
    onSuccess: async () => {
      setSelectedProductIds([]);
      await onRefresh();
    },
  });

  const handleSort = (key: CatalogSortKey) => {
    let direction: CatalogSortDirection = "asc";
    if (sortConfig?.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    } else if (sortConfig?.key === key && sortConfig.direction === "desc") {
      direction = null;
    }
    setSortConfig(direction ? { key, direction } : null);
    setCurrentPage(1);
  };

  const filteredParents = useMemo(() => {
    let result = [...products];

    if (searchFilter.trim()) {
      const search = searchFilter.toLowerCase().trim();
      result = result.filter(
        (product) =>
          product.name.toLowerCase().includes(search) ||
          (product.sku?.toLowerCase().includes(search) ?? false),
      );
    }

    if (selectedMarketplaces.length > 0) {
      result = result.filter((product) =>
        selectedMarketplaces.includes(product.derivedFromProvider ?? ""),
      );
    }

    if (sortConfig) {
      const { direction, key } = sortConfig;
      result.sort((a, b) =>
        compareCatalogSortValues(
          getCatalogSortValue(a, key),
          getCatalogSortValue(b, key),
          direction ?? "asc",
        ),
      );
    }

    return result;
  }, [products, searchFilter, selectedMarketplaces, sortConfig]);

  const filteredTotalPages = Math.max(
    1,
    Math.ceil(filteredParents.length / CATALOG_PAGE_SIZE),
  );
  const safeCurrentPage = Math.min(currentPage, filteredTotalPages);

  const visibleParents = useMemo(() => { 
    const start = (safeCurrentPage - 1) * CATALOG_PAGE_SIZE; 
    const end = start + CATALOG_PAGE_SIZE; 
    return filteredParents.slice(start, end); 
  }, [filteredParents, safeCurrentPage]); 

  const selectableVisibleRows = useMemo(
    () =>
      visibleParents.flatMap((product) => {
        const ownRows = product.isSyntheticParent ? [] : [product.id];
        const childRows = product.children
          .filter((child) => !child.isSyntheticParent)
          .map((child) => child.id);
        return [...ownRows, ...childRows];
      }),
    [visibleParents],
  );

  const selectedVisibleCount = selectableVisibleRows.filter((id) =>
    selectedProductIds.includes(id),
  ).length;
  const allVisibleSelected =
    selectableVisibleRows.length > 0 &&
    selectedVisibleCount === selectableVisibleRows.length;

  const selectedTotalValue = useMemo(() => {
    if (selectedProductIds.length === 0) return 0;
    const selectedSet = new Set(selectedProductIds);
    return products.reduce((sum, product) => {
      if (!selectedSet.has(product.id)) return sum;
      const price = Number(product.sellingPrice);
      return sum + (Number.isFinite(price) ? price : 0);
    }, 0);
  }, [products, selectedProductIds]);

  const hasActiveFilters = searchFilter.trim() || selectedMarketplaces.length > 0; 

  const clearAllFilters = () => {
    setSearchFilter("");
    setSelectedMarketplaces([]);
    setCurrentPage(1);
  };

  const handleExport = async () => { 
    try {
      setIsExporting(true);
      const params = new URLSearchParams();

      if (searchFilter.trim()) {
        params.set("search", searchFilter.trim());
      }

      if (selectedMarketplaces.length > 0) {
        params.set("marketplaces", selectedMarketplaces.join(","));
      }

      const blob = await apiClient.download(
        `/products/export${params.size > 0 ? `?${params.toString()}` : ""}`,
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `catalogo-produtos-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally { 
      setIsExporting(false); 
    } 
  }; 

  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  };

  const toggleVisibleSelection = () => {
    setSelectedProductIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !selectableVisibleRows.includes(id));
      }

      return [...new Set([...current, ...selectableVisibleRows])];
    });
  };

  const handleExportSelected = async () => {
    if (selectedProductIds.length === 0) {
      return;
    }

    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      params.set("ids", selectedProductIds.join(","));
      const blob = await apiClient.download(`/products/export?${params.toString()}`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `catalogo-produtos-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedProductIds.length === 0) {
      return;
    }

    if (!confirm("Excluir produtos selecionados?")) {
      return;
    }

    await bulkDeleteMutation.mutateAsync(selectedProductIds);
  };

  const SortIcon = ({ column }: { column: CatalogSortKey }) => {
    if (sortConfig?.key !== column) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
    }
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="h-3.5 w-3.5 text-accent" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5 text-accent" />
    );
  };

  if (products.length === 0) {
    return (
      <Card padding="lg">
        <EmptyState
          title="Nenhum produto cadastrado"
          description="Cadastre um produto manual para iniciar seu catálogo."
          icon={<Package className="h-6 w-6" />}
        />
      </Card>
    );
  }

  return (
    <>
      <Card padding="lg" className="min-w-0 flex flex-1 flex-col overflow-hidden min-h-0">
        <div className="mb-4 flex items-center justify-between gap-3 shrink-0"> 
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Produtos do catálogo
            </h3>
            <p className="text-xs text-muted-foreground/70">
              Itens cadastrados manualmente ou importados
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="gap-2"
              disabled={isExporting}
              onClick={() => {
                void handleExport();
              }}
            >
              <Download className="h-3.5 w-3.5" />
              {isExporting ? "Exportando..." : "Exportar"}
            </Button>

            <button
              onClick={() => setShowFilters((value) => !value)}
              className={`inline-flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium transition-all duration-[var(--transition-fast)] ${
                showFilters || hasActiveFilters
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "border border-border bg-surface-strong text-muted-foreground hover:border-border-strong hover:text-foreground"
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              Filtros
            </button>
          </div> 
        </div> 

        {selectedProductIds.length > 0 ? (
          <CatalogSelectionActionBar
            allVisibleSelected={allVisibleSelected}
            isDeleting={bulkDeleteMutation.isPending}
            isExporting={isExporting}
            onClearSelection={() => setSelectedProductIds([])}
            onDeleteSelected={() => {
              void handleDeleteSelected();
            }}
            onExportSelected={() => {
              void handleExportSelected();
            }}
            onSelectAllVisible={() => toggleVisibleSelection()}
            selectedCount={selectedProductIds.length}
            selectedTotalValue={selectedTotalValue}
            visibleCount={selectableVisibleRows.length}
          />
        ) : null}

        {showFilters ? ( 
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 rounded-[var(--radius-lg)] border border-border bg-surface-strong/50 p-4 shrink-0"
          >
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Search className="h-3.5 w-3.5 text-accent" />
                  Buscar produto
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(event) => {
                      setSearchFilter(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Nome ou SKU do produto..."
                    className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-background px-3 pr-8 text-sm text-foreground placeholder:text-muted-foreground/60 transition-all duration-[var(--transition-fast)] hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                  {searchFilter ? (
                    <button
                      onClick={() => {
                        setSearchFilter("");
                        setCurrentPage(1);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <Search className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Store className="h-3.5 w-3.5 text-accent" />
                  Marketplace
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {catalogMarketplaceOptions.map((option) => {
                    const isSelected = selectedMarketplaces.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        onClick={() =>
                          setSelectedMarketplaces((previous) =>
                            isSelected
                              ? previous.filter((value) => value !== option.value)
                              : [...previous, option.value],
                          )
                        }
                        className={`inline-flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium transition-all duration-[var(--transition-fast)] ${
                          isSelected
                            ? "bg-accent text-accent-foreground shadow-sm"
                            : "border border-border bg-background text-muted-foreground hover:border-border-strong hover:text-foreground"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {hasActiveFilters ? (
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 pt-4">
                <p className="text-xs text-muted-foreground">
                  {filteredParents.length} resultado{filteredParents.length === 1 ? "" : "s"} encontrado
                  {filteredParents.length === 1 ? "" : "s"}.
                </p>
                <button
                  onClick={clearAllFilters}
                  className="text-xs font-medium text-accent transition-colors hover:text-accent/80"
                >
                  Limpar filtros
                </button>
              </div>
            ) : null}
          </motion.div>
        ) : null}

        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full min-w-[1100px] border-separate border-spacing-0">
            <thead> 
              <tr className="border-b border-border bg-surface-strong/95"> 
                <th className="sticky top-0 z-10 w-12 bg-surface-strong/95 px-3 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={() => toggleVisibleSelection()}
                    aria-label="Selecionar produtos visiveis"
                  />
                </th>
                <th 
                  onClick={() => handleSort("channel")} 
                  className="sticky top-0 z-10 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95"
                >
                  <div className="flex items-center gap-1">
                    Canal
                    <SortIcon column="channel" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("name")}
                  className="sticky top-0 z-10 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95"
                >
                  <div className="flex items-center gap-1">
                    Produto
                    <SortIcon column="name" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("sku")}
                  className="sticky top-0 z-10 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95"
                >
                  <div className="flex items-center gap-1">
                    SKU
                    <SortIcon column="sku" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("sellingPrice")}
                  className="sticky top-0 z-10 px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95"
                >
                  <div className="flex items-center justify-end gap-1">
                    Preço de Venda
                    <SortIcon column="sellingPrice" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("unitCost")}
                  className="sticky top-0 z-10 px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95 min-w-[160px]"
                >
                  <div className="flex items-center justify-end gap-1">
                    Custo unitário
                    <SortIcon column="unitCost" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("packagingCost")}
                  className="sticky top-0 z-10 px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95"
                >
                  <div className="flex items-center justify-end gap-1">
                    Embalagem
                    <SortIcon column="packagingCost" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("isActive")}
                  className="sticky top-0 z-10 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95"
                >
                  <div className="flex items-center gap-1">
                    Status
                    <SortIcon column="isActive" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleParents.map((product) => {
                const isExpanded = expandedParentIds.includes(product.id);

                return (
                  <React.Fragment key={product.id}>
                    <tr 
                      className="cursor-pointer border-b border-border/50 hover:bg-surface-strong/30" 
                      onClick={() => { 
                        setSelectedProduct(product); 
                      }} 
                    > 
                      <td className="px-3 py-3 text-left">
                        <input
                          type="checkbox"
                          disabled={product.isSyntheticParent}
                          checked={selectedProductIds.includes(product.id)}
                          onChange={(event) => {
                            event.stopPropagation();
                            toggleProductSelection(product.id);
                          }}
                          onClick={(event) => event.stopPropagation()}
                          aria-label={`Selecionar ${product.name}`}
                        />
                      </td>
                      <td className="px-3 py-3 text-left"> 
                        {getChannelBadge(product.derivedFromProvider)} 
                      </td> 
                      <td className="px-3 py-3 text-sm font-medium text-foreground">
                        <div className="flex items-center gap-3">
                          <ProductImagePreview
                            alt={product.name}
                            className="h-10 w-10 shrink-0 rounded-[var(--radius-md)]"
                            url={product.coverImageUrl}
                          />
                          {product.latestCost ? null : (
                            <span
                              aria-label="Produto sem custos cadastrados"
                              className="inline-flex h-5 w-5 shrink-0 items-center justify-center self-center rounded-full bg-warning/10 text-warning"
                              title="Produto sem custos cadastrados"
                            >
                              <AlertTriangle className="h-3.5 w-3.5" />
                            </span>
                          )}
                          <span className="flex flex-col">
                            <span className="inline-flex items-center gap-2">
                              <span>{product.name}</span>
                            </span>
                            {product.catalogRole === "parent" && product.children.length > 0 ? (
                              <button
                                aria-label={`${isExpanded ? "Recolher" : "Expandir"} variações`}
                                className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground transition-colors hover:text-foreground"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setExpandedParentIds((current) =>
                                    current.includes(product.id)
                                      ? current.filter((value) => value !== product.id)
                                      : [...current, product.id],
                                  );
                                }}
                                type="button"
                              >
                                <span>
                                  {product.children.length} {product.children.length === 1 ? "variação" : "variações"}
                                </span>
                                <ChevronDown
                                  className={`h-3.5 w-3.5 transition-transform duration-[var(--transition-fast)] ${isExpanded ? "rotate-180" : ""}`}
                                />
                              </button>
                            ) : null}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-muted-foreground">
                        {product.sku ?? "Sem SKU"}
                      </td>
                      <td className="px-3 py-3 text-right text-sm text-foreground">
                        {formatMoney(Number(product.sellingPrice))}
                      </td>
                      <td className="px-3 py-3 text-right text-sm text-foreground">
                        {product.latestCost
                          ? formatMoney(Number(product.latestCost.amount))
                          : "—"}
                      </td>
                      <td className="px-3 py-3 text-right text-sm text-foreground">
                        {product.financeDefaults
                          ? formatMoney(Number(product.financeDefaults.packagingCost))
                          : "—"}
                      </td>
                      <td className="px-3 py-3 text-left">
                        <Badge
                          variant={product.isActive ? "success" : "neutral"}
                          className="gap-1.5"
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${product.isActive ? "bg-success" : "bg-muted"}`}
                          />
                          {product.isActive ? "Ativo" : "Arquivado"}
                        </Badge>
                      </td>
                    </tr>

                    {product.catalogRole === "parent" && isExpanded
                      ? product.children.map((child, childIndex) => {
                          const isLastChild = childIndex === product.children.length - 1;
                          return (
                            <tr 
                              key={child.id} 
                              data-testid="child-product-row" 
                              className="cursor-pointer border-b border-border/30 hover:bg-surface-strong/20" 
                              onClick={() => { 
                                setSelectedProduct(child); 
                              }} 
                            > 
                              <td className="px-3 py-3 text-left">
                                <input
                                  type="checkbox"
                                  checked={selectedProductIds.includes(child.id)}
                                  onChange={(event) => {
                                    event.stopPropagation();
                                    toggleProductSelection(child.id);
                                  }}
                                  onClick={(event) => event.stopPropagation()}
                                  aria-label={`Selecionar ${child.name}`}
                                />
                              </td>
                              <td className="px-3 py-3 text-left"> 
                                {getChannelBadge(child.derivedFromProvider)} 
                              </td> 
                              <td className="px-3 py-3 text-sm font-medium text-foreground">
                                <div className="flex items-center gap-3">
                                  {/* Tree connector — GitHub worktree style */}
                                  <div className="relative flex h-10 w-8 shrink-0 items-center justify-center">
                                    <div
                                      className={cn(
                                        "absolute left-[11px] top-0 w-px bg-muted-foreground/25",
                                        isLastChild ? "h-1/2" : "h-full",
                                      )}
                                    />
                                    <div className="absolute left-[11px] top-1/2 flex -translate-y-1/2 items-center">
                                      <div className="h-px w-3 bg-muted-foreground/25" />
                                      <div className="h-2 w-2 rounded-full border border-muted-foreground/40 bg-muted-foreground/20" />
                                    </div>
                                  </div>
                                  <ProductImagePreview
                                    alt={child.name}
                                    className="h-10 w-10 shrink-0 rounded-[var(--radius-md)]"
                                    url={child.coverImageUrl}
                                  />
                                  {child.latestCost ? null : (
                                    <span
                                      aria-label="Produto sem custos cadastrados"
                                      className="inline-flex h-5 w-5 shrink-0 items-center justify-center self-center rounded-full bg-warning/10 text-warning"
                                      title="Produto sem custos cadastrados"
                                    >
                                      <AlertTriangle className="h-3.5 w-3.5" />
                                    </span>
                                  )}
                                  <span className="flex flex-col">
                                    <span className="inline-flex items-center gap-2">
                                      <span>{child.name}</span>
                                    </span>
                                    {child.variationLabel ? (
                                      <span className="text-xs font-normal text-muted-foreground">
                                        {child.variationLabel}
                                      </span>
                                    ) : null}
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-sm text-muted-foreground"> 
                                {child.sku ?? "Sem SKU"} 
                              </td> 
                              <td className="px-3 py-3 text-right text-sm text-foreground"> 
                                {formatMoney(Number(child.sellingPrice))} 
                              </td> 
                              <td className="px-3 py-3 text-right text-sm text-foreground"> 
                                {child.latestCost 
                                  ? formatMoney(Number(child.latestCost.amount)) 
                                  : "—"} 
                              </td> 
                              <td className="px-3 py-3 text-right text-sm text-foreground"> 
                                {child.financeDefaults 
                                  ? formatMoney(Number(child.financeDefaults.packagingCost)) 
                                  : "—"} 
                              </td> 
                              <td className="px-3 py-3 text-left">
                                <Badge
                                  variant={child.isActive ? "success" : "neutral"}
                                  className="gap-1.5"
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${child.isActive ? "bg-success" : "bg-muted"}`}
                                  />
                                  {child.isActive ? "Ativo" : "Arquivado"}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })
                      : null}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredParents.length === 0 ? (
          <div className="shrink-0 rounded-[var(--radius-lg)] border border-dashed border-border/70 bg-background-soft/60 px-6 py-10 text-center">
            <p className="text-sm font-medium text-foreground">Nenhum produto encontrado</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ajuste os filtros para visualizar outros SKUs ou canais.
            </p>
          </div>
        ) : null}

        {filteredParents.length > 0 ? (
          <div className="shrink-0 pt-4">
            <Pagination
              currentPage={safeCurrentPage}
              onPageChange={(page) => setCurrentPage(page)}
              totalPages={filteredTotalPages}
            />
          </div>
        ) : null}
      </Card>
      <CatalogProductDetailsModal 
        onDeleted={onRefresh} 
        onClose={() => { 
          setSelectedProduct(null); 
        }} 
        onSaved={onRefresh} 
        product={selectedProduct} 
      /> 
    </>
  );
}

export function ProductsHome({
  view = "catalog",
  onAddProduct,
  onImportProducts,
}: ProductsHomeProps) {
  const [performancePage, setPerformancePage] = useState(1);
  const [performanceSearch, setPerformanceSearch] = useState("");
  const [performanceMarketplaces, setPerformanceMarketplaces] = useState<string[]>([]);
  const [performanceSort, setPerformanceSort] = useState<{
    key: PerformanceSortKey;
    direction: "asc" | "desc" | null;
  } | null>(null);
  const {
    data,
    referenceMonth,
    referenceMonthSelectOptions,
    stats,
    financialState,
    isLoading,
    error,
    isUnauthorized,
    setReferenceMonth,
    refresh,
    refetch,
  } = useProductData();
  const performanceQuery = useProductPerformancePage(
    {
      marketplaces:
        performanceMarketplaces.length > 0
          ? (performanceMarketplaces as Array<"mercadolivre" | "shopee" | "shein">)
          : undefined,
      page: performancePage,
      pageSize: 10,
      referenceMonth,
      search: performanceSearch || undefined,
      sortBy: performanceSort?.direction ? performanceSort.key : undefined,
      sortDirection: performanceSort?.direction ?? undefined,
    },
    view === "performance",
  );
  const marketplaceNotice = data ? buildMarketplaceSyncNotice(data) : null;
  const handleAddProduct = () =>
    onAddProduct?.({
      companyId: data?.scope.companyId ?? null,
      referenceMonth,
    });

  useEffect(() => {
    setPerformancePage(1);
  }, [referenceMonth]);

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
  const addProductButton = (
    <Button
      size="md"
      className="gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg active:translate-y-0 active:shadow-sm"
      onClick={handleAddProduct}
    >
      <Plus className="h-4 w-4" />
      Cadastrar produto
    </Button>
  );
  const importButton = (
    <Button
      size="md"
      variant="secondary"
      className="gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
      onClick={onImportProducts}
    >
      <Upload className="h-4 w-4" />
      Importar produtos
    </Button>
  );
  const topActions = (
    <div className="flex items-center gap-3">
      {view === "performance" ? monthToolbar : null}
      {view !== "performance" ? importButton : null}
      {view !== "performance" ? addProductButton : null}
    </div>
  );

  if (financialState === "empty") {
    return (
      <motion.div
        variants={fadeInVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <ProductHeader title={view === "catalog" ? "Catálogo" : "Performance"} stats={stats} />
        {marketplaceNotice ? (
          <MarketplaceNoticeCard notice={marketplaceNotice} />
        ) : null}
        <EmptyCatalogState
          onAdd={handleAddProduct}
          onImport={onImportProducts}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex max-h-[calc(100vh-112px)] flex-col gap-6 overflow-hidden md:max-h-[calc(100vh-128px)]"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <ProductHeader title={view === "catalog" ? "Catálogo" : "Performance"} stats={stats} />
        {topActions}
      </div>

      {view === "catalog" && marketplaceNotice ? (
        <MarketplaceNoticeCard notice={marketplaceNotice} />
      ) : null}

      {view === "catalog" ? <hr className="border-border/60" /> : null}

      {view === "performance" && financialState === "no-costs" ? (
        <NoCostsState />
      ) : null}

      <section className="min-w-0 flex flex-1 flex-col min-h-0">
        {view === "catalog" ? (
          <CatalogProductsHierarchyTable
            onRefresh={refresh}
            products={data?.products ?? []}
          />
        ) : (
          <ProductTable
            error={Boolean(performanceQuery.error)}
            loading={performanceQuery.isLoading}
            onPageChange={setPerformancePage}
            onSearchFilterChange={(value) => {
              setPerformanceSearch(value);
              setPerformancePage(1);
            }}
            onSelectedMarketplacesChange={(value) => {
              setPerformanceMarketplaces(value);
              setPerformancePage(1);
            }}
            onSortChange={(value) => {
              setPerformanceSort(value);
              setPerformancePage(1);
            }}
            pagination={
              performanceQuery.data
                ? {
                    currentPage: performanceQuery.data.page,
                    pageSize: performanceQuery.data.pageSize,
                    totalItems: performanceQuery.data.totalItems,
                    totalPages: performanceQuery.data.totalPages,
                  }
                : {
                    currentPage: performancePage,
                    pageSize: 10,
                    totalItems: 0,
                    totalPages: 1,
                  }
            }
            rows={performanceQuery.data?.items ?? []}
            searchFilter={performanceSearch}
            selectedMarketplaces={performanceMarketplaces}
            serverMode
            sortConfig={performanceSort}
          />
        )}
      </section>
    </motion.div>
  );
}
