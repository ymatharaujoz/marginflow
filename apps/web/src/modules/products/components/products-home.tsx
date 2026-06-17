"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  RefreshCw,
  Plus,
  Upload,
  AlertCircle,
  Package,
  Box,
  DollarSign,
  BarChart3,
  Sparkles,
  ArrowRight,
  ChevronDown,
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
import { CurrencyInput } from "./currency-input";
import { ApiClientError, apiClient } from "@/lib/api/client";
import { containerVariants, fadeInVariants } from "@/lib/animations";
import { SkeletonGrid } from "@/components/ui-premium/skeleton-grid";
import { ProductHeader } from "./product-header";
import { ProductFinancialIndicators } from "./product-financial-indicators";

import { ProductTable } from "./product-table";
import {
  formatReferenceMonthPtBr,
  useProductData,
} from "../hooks/use-product-data";
import { buildMarketplaceSyncNotice } from "../calculations/product-insights";
import { formatMoney } from "../utils/formatters";
import type { CatalogStats, ProductMarketplaceNotice } from "../types/products";

interface ProductsHomeProps {
  organizationName: string;
  view?: "catalog" | "performance";
  onAddProduct?: (context: {
    companyId: string | null;
    referenceMonth: string;
  }) => void;
  onImportProducts?: () => void;
}

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
            Leva menos de 5 minutos
          </p>
        </div>
      </Card>
    </motion.div>
  );
}

function NoCostsState({
  stats,
  onAdd,
}: { stats: CatalogStats } & { onAdd?: () => void }) {
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
                Você tem {stats.totalProducts} produto
                {stats.totalProducts > 1 ? "s" : ""} mas nenhum custo
                registrado. Os custos são essenciais para calcular margens e
                lucratividade.
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            className="gap-2 shrink-0"
            onClick={onAdd}
          >
            <Plus className="h-4 w-4" />
            Adicionar custo
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
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [heroFailed, setHeroFailed] = useState(false);

  useEffect(() => {
    if (!product) {
      setForm({ packagingCost: "", unitCost: "" });
      setErrorMessage(null);
      setSelectedImageIndex(0);
      return;
    }

    setForm(buildCatalogFinanceForm(product));
    setErrorMessage(null);
    setSelectedImageIndex(0);
  }, [product]);

  const images = product?.images ?? [];
  const currentImage = images[selectedImageIndex] ?? null;

  useEffect(() => {
    setHeroFailed(false);
  }, [currentImage?.url]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!product) {
        throw new Error("Produto não encontrado.");
      }

      return apiClient.patch<{ data: ProductListItem; error: null }>(
        `/products/${product.id}/catalog-finance`,
        {
          body: {
            packagingCost: form.packagingCost.trim(),
            unitCost: form.unitCost.trim(),
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
              <span className="font-mono text-[11px] text-muted-foreground/60">
                SKU: {product.sku ?? "—"}
              </span>
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
              saveMutation.mutate();
            }}
            className="flex flex-col gap-6"
          >
            {/* Status */}
            <div className="flex justify-center">
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider",
                  product.isActive
                    ? "bg-emerald-500/10 text-emerald-600 ring-1 ring-inset ring-emerald-500/20"
                    : "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
                )}
              >
                {product.isActive ? "Ativo" : "Arquivado"}
              </span>
            </div>

            {/* Imagem hero + miniaturas — centralizado */}
            <div className="mx-auto w-full max-w-[320px]">
              <div className="relative mb-4 aspect-[4/3] overflow-hidden rounded-[var(--radius-xl)] border border-border/60 bg-gradient-to-br from-surface-strong via-surface to-background shadow-[var(--shadow-md)]">
                {currentImage && !heroFailed ? (
                  <Image
                    alt={product.name}
                    className="object-cover"
                    fill
                    onError={() => setHeroFailed(true)}
                    sizes="320px"
                    src={currentImage.url}
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Package className="h-10 w-10" />
                    <span className="text-xs">Sem foto</span>
                  </div>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex flex-wrap justify-center gap-3">
                  {images.map((image, index) => (
                    <button
                      key={image.id}
                      onClick={() => setSelectedImageIndex(index)}
                      type="button"
                      className={cn(
                        "relative h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius-lg)] border-2 transition-all",
                        index === selectedImageIndex
                          ? "border-accent ring-2 ring-accent/20"
                          : "border-border/40 opacity-50 hover:opacity-100",
                      )}
                    >
                      <Image
                        alt=""
                        className="object-cover"
                        fill
                        sizes="64px"
                        src={image.url}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Seção financeira */}
            <div className="rounded-[var(--radius-xl)] border border-border/30 bg-gradient-to-br from-surface/80 via-surface-strong/30 to-background/10 p-5 shadow-[var(--shadow-sm)]">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] bg-accent/10 ring-1 ring-accent/20">
                  <DollarSign className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-accent">
                    Informações Financeiras
                  </h3>
                  <p className="text-[11px] text-muted-foreground/70">
                    Preencha os custos do produto
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    className="text-xs font-medium text-muted-foreground"
                    htmlFor="catalog-unit-cost"
                  >
                    Custo unitário <span className="text-error">*</span>
                  </label>
                  <div className="mt-2">
                    <CurrencyInput
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
                <div className="sm:col-span-2 pt-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Preço de venda
                  </p>
                  <p className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">
                    {formatMoney(product.sellingPrice)}
                  </p>
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
              <Button
                onClick={() => {
                  if (!window.confirm("Excluir este produto do catálogo?")) {
                    return;
                  }
                  deleteMutation.mutate();
                }}
                type="button"
                variant="ghost"
                className="border border-error/20 text-error hover:bg-error/5 hover:text-error"
              >
                Excluir produto
              </Button>
              <Button
                type="submit"
                className="px-6"
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
      <Card padding="lg">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">
            Produtos do catálogo
          </h3>
          <p className="text-xs text-muted-foreground">
            Itens cadastrados manualmente ou importados.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-separate border-spacing-0">
            <thead>
              <tr className="border-b border-border bg-surface-strong/95">
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Produto
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  SKU
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Preço de venda
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Custo unitário
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Embalagem
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Criado em
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
                      <span>{product.name}</span>
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
                      : "Sem custo"}
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
                  <td className="px-3 py-3 text-sm text-muted-foreground">
                    {formatProductDate(product.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

export function ProductsHome({
  organizationName,
  view = "catalog",
  onAddProduct,
  onImportProducts,
}: ProductsHomeProps) {
  const {
    data,
    referenceMonth,
    referenceMonthSelectOptions,
    stats,
    rows,
    pagination,
    financialState,
    isLoading,
    error,
    isUnauthorized,
    setReferenceMonth,
    refresh,
    refetch,
    goToPage,
  } = useProductData();
  const marketplaceNotice = data ? buildMarketplaceSyncNotice(data) : null;
  const handleAddProduct = () =>
    onAddProduct?.({
      companyId: data?.scope.companyId ?? null,
      referenceMonth,
    });

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
        <ProductHeader organizationName={organizationName} stats={stats} />
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

  if (financialState === "no-costs" && stats) {
    return (
      <motion.div
        variants={fadeInVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <ProductHeader organizationName={organizationName} stats={stats} />
        {marketplaceNotice ? (
          <MarketplaceNoticeCard notice={marketplaceNotice} />
        ) : null}
        <NoCostsState stats={stats} onAdd={handleAddProduct} />
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <ProductHeader organizationName={organizationName} stats={stats} />
        {topActions}
      </div>

      {view === "catalog" && marketplaceNotice ? (
        <MarketplaceNoticeCard notice={marketplaceNotice} />
      ) : null}

      {view === "performance" ? (
        <>
          <hr className="border-border/60" />
          <ProductFinancialIndicators rows={rows} />
        </>
      ) : null}

      {view === "catalog" ? <hr className="border-border/60" /> : null}

      <section className="min-w-0 w-full space-y-3">
        {view === "catalog" ? (
          <CatalogProductsTable onRefresh={refresh} products={data?.products ?? []} />
        ) : (
          <ProductTable
            rows={rows}
            pagination={pagination}
            onPageChange={goToPage}
          />
        )}
      </section>
    </motion.div>
  );
}
