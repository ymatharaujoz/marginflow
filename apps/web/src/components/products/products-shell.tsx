"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { Package, Loader2, Upload, CheckCircle2, AlertCircle, AlertTriangle, FileWarning, FileSpreadsheet, Tag, DollarSign } from "lucide-react";
import { Badge, Button, Card, Input, Modal, cn } from "@marginflow/ui";
import type {
  AdCostFormValues,
  AdCostRecord,
  ManualExpenseFormValues,
  ManualExpenseRecord,
  ProductCostFormValues,
  ProductCostRecord,
  ProductFormValues,
  ProductListItem,
  ProductManualCreateResult,
  SyncedProductActionResult,
  SyncedProductRecord,
} from "@marginflow/types";
import { ApiClientError, apiClient } from "@/lib/api/client";
import {
  fetchProductCatalog,
  productCatalogQueryKey,
} from "@/modules/products";
import type { ProductInsight } from "@/modules/products";
import { ProductsActionsProvider } from "./products-actions-context";
import type { FeedbackTone, SyncedProductMutationInput } from "./products-actions-context";
import { getCatalogCompanyRequirementMessage } from "./manual-product-company-state";

type ManualProductFormState = {
  isActive: boolean;
  name: string;
  packagingCost: string;
  sellingPrice: string;
  sku: string;
  unitCost: string;
};

const initialProductForm: ProductFormValues = {
  isActive: true,
  name: "",
  sellingPrice: "0.00",
  sku: null,
};

const initialManualProductForm: ManualProductFormState = {
  isActive: true,
  name: "",
  packagingCost: "",
  sellingPrice: "",
  sku: "",
  unitCost: "",
};

function parseCurrencyValue(raw: string): string {
  let cleaned = raw.replace(/[^\d.,]/g, "");
  const parts = cleaned.split(/[.,]/);
  if (parts.length > 2) {
    cleaned = parts.slice(0, -1).join("") + "." + parts[parts.length - 1];
  } else {
    cleaned = cleaned.replace(",", ".");
  }
  if (!cleaned || isNaN(Number(cleaned))) return "";
  return cleaned;
}

function CurrencyInput({
  value,
  onChange,
  placeholder,
  required,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const [text, setText] = useState(() =>
    value
      ? Number(value).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : ""
  );

  useEffect(() => {
    setText(
      value
        ? Number(value).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : ""
    );
  }, [value]);

  const handleBlur = () => {
    const parsed = parseCurrencyValue(text);
    onChange(parsed);
    setText(
      parsed
        ? Number(parsed).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : ""
    );
  };

  return (
    <input
      className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-surface-strong pl-9 pr-3.5 text-sm text-foreground transition-all duration-[var(--transition-fast)] placeholder:text-muted hover:border-border-strong focus:border-border-focus focus:outline-2 focus:outline-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
      inputMode="decimal"
      onBlur={handleBlur}
      onChange={(e) => setText(e.target.value)}
      placeholder={placeholder}
      required={required}
      type="text"
      value={text}
    />
  );
}

type FormSectionProps = {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  variants?: Variants;
};

function FormSection({ title, description, icon, children, variants }: FormSectionProps) {
  return (
    <motion.div
      variants={variants}
      initial={variants ? undefined : { opacity: 0, y: 12 }}
      animate={variants ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="rounded-[var(--radius-lg)] border border-border/40 bg-gradient-to-br from-surface/90 via-surface-strong/40 to-background/20 p-5 shadow-[var(--shadow-xs)]"
    >
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 ring-1 ring-accent/20">
          {icon}
        </div>
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
            {title}
          </h3>
          <p className="text-[11px] text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </motion.div>
  );
}

type PremiumSwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  variants?: Variants;
};

function PremiumSwitch({ checked, onChange, icon, title, description, variants }: PremiumSwitchProps) {
  return (
    <motion.div
      variants={variants}
      initial={variants ? undefined : { opacity: 0, y: 12 }}
      animate={variants ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex items-center justify-between rounded-[var(--radius-lg)] border border-border/40 bg-gradient-to-br from-surface/90 via-surface-strong/40 to-background/20 p-4 shadow-[var(--shadow-xs)]"
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-200",
            checked ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"
          )}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-strong",
          checked ? "bg-accent" : "bg-muted-foreground/30"
        )}
      >
        <span
          className={cn(
            "absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </motion.div>
  );
}

const initialProductCostForm: ProductCostFormValues = {
  productId: "",
  costType: "base",
  amount: "0.00",
  currency: "BRL",
  effectiveFrom: null,
  notes: null,
};

const initialAdCostForm: AdCostFormValues = {
  productId: null,
  channel: "manual",
  amount: "0.00",
  currency: "BRL",
  spentAt: null,
  notes: null,
};

const initialManualExpenseForm: ManualExpenseFormValues = {
  category: "general",
  amount: "0.00",
  currency: "BRL",
  incurredAt: null,
  notes: null,
};

function normalizeTextInput(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

interface ProductsShellProps {
  activeCompanyCount?: number;
  organizationName: string;
  children: React.ReactNode;
}

export function ProductsShell({
  activeCompanyCount = 1,
  organizationName,
  children,
}: ProductsShellProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();

  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>("neutral");

  const [showProductForm, setShowProductForm] = useState(false);
  const [showCostForm, setShowCostForm] = useState(false);
  const [showAdCostForm, setShowAdCostForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showSyncedProducts, setShowSyncedProducts] = useState(false);
  const [showSyncedReviewPanel, setShowSyncedReviewPanel] = useState(false);
  const [showManualProductModal, setShowManualProductModal] = useState(false);
  const [showImportInstructionsModal, setShowImportInstructionsModal] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    errors: Array<{ row: number; message: string }>;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [productForm, setProductForm] = useState(initialProductForm);
  const [manualProductForm, setManualProductForm] = useState(initialManualProductForm);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productCostForm, setProductCostForm] = useState(initialProductCostForm);
  const [editingProductCostId, setEditingProductCostId] = useState<string | null>(null);
  const [adCostForm, setAdCostForm] = useState(initialAdCostForm);
  const [editingAdCostId, setEditingAdCostId] = useState<string | null>(null);
  const [manualExpenseForm, setManualExpenseForm] = useState(initialManualExpenseForm);
  const [editingManualExpenseId, setEditingManualExpenseId] = useState<string | null>(null);
  const [linkSelections, setLinkSelections] = useState<Record<string, string>>({});
  const [availableProducts, setAvailableProducts] = useState<ProductListItem[]>([]);
  const [availableSyncedProducts, setAvailableSyncedProducts] = useState<SyncedProductRecord[]>([]);
  const catalogCompanyRequirementMessage = getCatalogCompanyRequirementMessage(activeCompanyCount);

  async function refreshCatalog(message?: string, tone: FeedbackTone = "neutral") {
    await queryClient.invalidateQueries({ queryKey: productCatalogQueryKey });
    if (message) {
      setFeedbackMessage(message);
      setFeedbackTone(tone);
    }
  }

  function setCriticalFeedback(error: unknown, fallback: string) {
    setFeedbackMessage(error instanceof ApiClientError ? error.message : fallback);
    setFeedbackTone("critical");
  }

  const blockCatalogCreationIfCompanyRuleFails = useCallback(() => {
    if (!catalogCompanyRequirementMessage) {
      return false;
    }

    setFeedbackMessage(catalogCompanyRequirementMessage);
    setFeedbackTone("critical");
    return true;
  }, [catalogCompanyRequirementMessage]);

  const productMutation = useMutation({
    mutationFn: async () => {
      if (editingProductId) {
        return apiClient.patch<{ data: ProductListItem; error: null }>(
          `/products/${editingProductId}`,
          { body: productForm }
        );
      }
      return apiClient.post<{ data: ProductListItem; error: null }>("/products", {
        body: productForm,
      });
    },
    onError: (error) => {
      setCriticalFeedback(error, "Nao foi possivel processar o produto.");
    },
    onSuccess: async () => {
      setEditingProductId(null);
      setProductForm(initialProductForm);
      setShowProductForm(false);
      await refreshCatalog(editingProductId ? "Produto atualizado." : "Produto criado.");
    },
  });

  const productCostMutation = useMutation({
    mutationFn: async () => {
      if (editingProductCostId) {
        return apiClient.patch<{ data: ProductCostRecord; error: null }>(
          `/costs/products/${editingProductCostId}`,
          { body: productCostForm }
        );
      }
      return apiClient.post<{ data: ProductCostRecord; error: null }>("/costs/products", {
        body: productCostForm,
      });
    },
    onError: (error) => {
      setCriticalFeedback(error, "Nao foi possivel processar o custo do produto.");
    },
    onSuccess: async () => {
      setEditingProductCostId(null);
      setProductCostForm(initialProductCostForm);
      setShowCostForm(false);
      await refreshCatalog(
        editingProductCostId ? "Custo do produto atualizado." : "Custo do produto criado."
      );
    },
  });

  const adCostMutation = useMutation({
    mutationFn: async () => {
      if (editingAdCostId) {
        return apiClient.patch<{ data: AdCostRecord; error: null }>(
          `/costs/ads/${editingAdCostId}`,
          { body: adCostForm }
        );
      }
      return apiClient.post<{ data: AdCostRecord; error: null }>("/costs/ads", {
        body: adCostForm,
      });
    },
    onError: (error) => {
      setCriticalFeedback(error, "Nao foi possivel processar o custo em anuncios.");
    },
    onSuccess: async () => {
      setEditingAdCostId(null);
      setAdCostForm(initialAdCostForm);
      setShowAdCostForm(false);
      await refreshCatalog(
        editingAdCostId ? "Custo em anuncios atualizado." : "Custo em anuncios criado."
      );
    },
  });

  const manualExpenseMutation = useMutation({
    mutationFn: async () => {
      if (editingManualExpenseId) {
        return apiClient.patch<{ data: ManualExpenseRecord; error: null }>(
          `/costs/expenses/${editingManualExpenseId}`,
          { body: manualExpenseForm }
        );
      }
      return apiClient.post<{ data: ManualExpenseRecord; error: null }>("/costs/expenses", {
        body: manualExpenseForm,
      });
    },
    onError: (error) => {
      setCriticalFeedback(error, "Nao foi possivel processar a despesa.");
    },
    onSuccess: async () => {
      setEditingManualExpenseId(null);
      setManualExpenseForm(initialManualExpenseForm);
      setShowExpenseForm(false);
      await refreshCatalog(editingManualExpenseId ? "Despesa atualizada." : "Despesa criada.");
    },
  });

  const syncedProductMutation = useMutation({
    mutationFn: async (input: SyncedProductMutationInput) => {
      if (input.action === "import") {
        return apiClient.post<{ data: SyncedProductActionResult; error: null }>(
          `/integrations/mercadolivre/products/${input.externalProductId}/import`
        );
      }
      if (input.action === "ignore") {
        return apiClient.post<{ data: SyncedProductActionResult; error: null }>(
          `/integrations/mercadolivre/products/${input.externalProductId}/ignore`
        );
      }
      return apiClient.post<{ data: SyncedProductActionResult; error: null }>(
        `/integrations/mercadolivre/products/${input.externalProductId}/link`,
        { body: { productId: input.productId } }
      );
    },
    onError: (error) => {
      setCriticalFeedback(error, "Nao foi possivel revisar o produto sincronizado.");
    },
    onSuccess: async (response) => {
      await refreshCatalog(response.data.message);
    },
  });

  const manualProductMutation = useMutation({
    mutationFn: async () => {
      if (blockCatalogCreationIfCompanyRuleFails()) {
        throw new Error(catalogCompanyRequirementMessage ?? "Empresa ativa inválida.");
      }
      return apiClient.post<{ data: ProductManualCreateResult; error: null }>("/products/manual", {
        body: {
          initialFinance: {
            packagingCost: manualProductForm.packagingCost,
            unitCost: manualProductForm.unitCost,
          },
          product: {
            isActive: manualProductForm.isActive,
            name: manualProductForm.name,
            sellingPrice: manualProductForm.sellingPrice,
            sku: manualProductForm.sku,
          },
        },
      });
    },
    onError: (error) => {
      setCriticalFeedback(error, "Nao foi possivel cadastrar o produto manual.");
    },
    onSuccess: async () => {
      setShowManualProductModal(false);
      setManualProductForm(initialManualProductForm);
      await refreshCatalog("Produto manual cadastrado com sucesso.");
    },
  });

  const importProductsMutation = useMutation({
    mutationFn: async (file: File) => {
      if (blockCatalogCreationIfCompanyRuleFails()) {
        throw new Error(catalogCompanyRequirementMessage ?? "Empresa ativa inválida.");
      }
      const formData = new FormData();
      formData.append("file", file);
      return apiClient.post<{ data: { imported: number; errors: Array<{ row: number; message: string }> }; error: null }>(
        "/products/import",
        { body: formData },
      );
    },
    onError: (error) => {
      setImportResult({ imported: 0, errors: [{ row: 0, message: error instanceof ApiClientError ? error.message : "Erro ao importar planilha." }] });
    },
    onSuccess: async (response) => {
      setImportResult(response.data);
      if (response.data.imported > 0) {
        await queryClient.invalidateQueries({ queryKey: productCatalogQueryKey });
      }
    },
  });

  const handleImportProducts = useCallback(() => {
    if (blockCatalogCreationIfCompanyRuleFails()) {
      return;
    }
    setShowImportInstructionsModal(true);
  }, [blockCatalogCreationIfCompanyRuleFails]);

  const handleAddProduct = useCallback(
    (_context?: { companyId: string | null; referenceMonth: string }) => {
      if (blockCatalogCreationIfCompanyRuleFails()) {
        return;
      }
      setFeedbackMessage(null);
      setEditingProductId(null);
      setProductForm(initialProductForm);
      setShowProductForm(false);
      setShowCostForm(false);
      setShowAdCostForm(false);
      setShowExpenseForm(false);
      setShowSyncedProducts(false);
      setShowSyncedReviewPanel(false);
      setShowManualProductModal(true);
      setManualProductForm(initialManualProductForm);
    },
    [blockCatalogCreationIfCompanyRuleFails]
  );

  async function fetchProductsForSelect() {
    const response = await apiClient.get<{ data: ProductListItem[]; error: null }>("/products");
    const products = response.data ?? [];
    setAvailableProducts(products);
    return products;
  }

  const handleOpenSyncedProducts = useCallback(async () => {
    setShowProductForm(false);
    setShowCostForm(false);
    setShowAdCostForm(false);
    setShowExpenseForm(false);
    setShowSyncedProducts(false);
    setShowSyncedReviewPanel(true);

    const [products, snapshot] = await Promise.all([
      fetchProductsForSelect(),
      fetchProductCatalog(),
    ]);

    setAvailableProducts(products);
    setAvailableSyncedProducts(snapshot.syncedProducts);
    setLinkSelections(
      snapshot.syncedProducts.reduce<Record<string, string>>((acc, item) => {
        acc[item.externalProductId] =
          item.linkedProduct?.id ?? item.suggestedMatches[0]?.productId ?? "";
        return acc;
      }, {})
    );
  }, []);

  const [productOptions, setProductOptions] = useState<Array<{ label: string; value: string }>>([]);

  // Atualizar productOptions quando availableProducts mudar
  useEffect(() => {
    setProductOptions(
      availableProducts.map((product) => ({
        label: `${product.name}${product.isActive ? "" : " (arquivado)"}`,
        value: product.id,
      }))
    );
  }, [availableProducts]);

  if ((showCostForm || showAdCostForm) && productOptions.length === 0) {
    void fetchProductsForSelect();
  }

  const selectedProductId = productCostForm.productId || productOptions[0]?.value || "";

  const contextValue = {
    handleAddProduct,
    handleImportProducts,
    availableSyncedProducts,
    availableProducts,
    linkSelections,
    setLinkSelections,
    syncedProductMutation,
    feedbackMessage,
    feedbackTone,
  };

  const renderForms = () => {
    if (
      !showProductForm &&
      !showCostForm &&
      !showAdCostForm &&
      !showExpenseForm &&
      !showSyncedProducts
    ) {
      return null;
    }

    return (
      <div className="mt-6 space-y-6">
        {feedbackMessage ? (
          <div className="mb-4">
            <div
              className={
                feedbackTone === "critical"
                  ? "rounded-[var(--radius-md)] border border-error/20 bg-error-soft px-4 py-3 text-sm text-foreground"
                  : "rounded-[var(--radius-md)] border border-border bg-background-soft px-4 py-3 text-sm text-muted-foreground"
              }
            >
              {feedbackMessage}
            </div>
          </div>
        ) : null}

        {/* Formulario de Produto */}
        {showProductForm && (
          <Card>
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-accent">Produto</p>
              <h2 className="text-lg font-semibold text-foreground">
                {editingProductId ? "Editar produto" : "Criar produto"}
              </h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Use o mesmo fluxo para cadastrar agora ou ajustar depois.
              </p>
            </div>
            <form
              className="mt-6 grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                setFeedbackMessage(null);
                productMutation.mutate();
              }}
            >
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-foreground">Nome do produto</span>
                <input
                  className="h-10 rounded-[var(--radius-md)] border border-border bg-surface-strong px-3.5 text-sm text-foreground placeholder:text-muted transition-all duration-[var(--transition-fast)] hover:border-border-strong focus:border-border-focus focus:outline-2 focus:outline-accent/20"
                  onChange={(event) =>
                    setProductForm((current) => ({ ...current, name: event.target.value }))
                  }
                  required
                  value={productForm.name}
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-foreground">SKU</span>
                <input
                  className="h-10 rounded-[var(--radius-md)] border border-border bg-surface-strong px-3.5 text-sm text-foreground placeholder:text-muted transition-all duration-[var(--transition-fast)] hover:border-border-strong focus:border-border-focus focus:outline-2 focus:outline-accent/20"
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      sku: normalizeTextInput(event.target.value),
                    }))
                  }
                  value={productForm.sku ?? ""}
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-foreground">Preco de venda</span>
                <input
                  className="h-10 rounded-[var(--radius-md)] border border-border bg-surface-strong px-3.5 text-sm text-foreground placeholder:text-muted transition-all duration-[var(--transition-fast)] hover:border-border-strong focus:border-border-focus focus:outline-2 focus:outline-accent/20"
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      sellingPrice: event.target.value,
                    }))
                  }
                  required
                  type="number"
                  value={productForm.sellingPrice}
                />
              </label>
              <label className="flex items-center gap-3 text-sm text-muted-foreground">
                <input
                  checked={productForm.isActive}
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      isActive: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                Produto ativo
              </label>
              <div className="flex flex-wrap gap-3">
                <Button disabled={productMutation.isPending} type="submit">
                  {productMutation.isPending
                    ? "Salvando..."
                    : editingProductId
                      ? "Atualizar produto"
                      : "Criar produto"}
                </Button>
                <Button
                  onClick={() => {
                    setEditingProductId(null);
                    setProductForm(initialProductForm);
                    setShowProductForm(false);
                  }}
                  type="button"
                  variant="secondary"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Formulario de Custo de Produto */}
        {showCostForm && (
          <Card>
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-accent">Formulario de custo</p>
              <h2 className="text-lg font-semibold text-foreground">
                {editingProductCostId ? "Editar custo do produto" : "Criar custo do produto"}
              </h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Cada lancamento fica gravado separadamente para manter conciliacoes futuras.
              </p>
            </div>
            <form
              className="mt-6 grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                setFeedbackMessage(null);
                productCostMutation.mutate();
              }}
            >
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-foreground">Produto</span>
                <select
                  className="h-10 rounded-[var(--radius-md)] border border-border bg-surface-strong px-3 text-sm text-foreground transition-all duration-[var(--transition-fast)] hover:border-border-strong focus:border-border-focus focus:outline-2 focus:outline-accent/20"
                  onChange={(event) =>
                    setProductCostForm((current) => ({
                      ...current,
                      productId: event.target.value,
                    }))
                  }
                  value={selectedProductId}
                >
                  {productOptions.length > 0
                    ? productOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))
                    : [<option key="empty" value="">Crie um produto primeiro</option>]}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-foreground">Tipo de custo</span>
                <input
                  className="h-10 rounded-[var(--radius-md)] border border-border bg-surface-strong px-3.5 text-sm text-foreground placeholder:text-muted transition-all duration-[var(--transition-fast)] hover:border-border-strong focus:border-border-focus focus:outline-2 focus:outline-accent/20"
                  onChange={(event) =>
                    setProductCostForm((current) => ({
                      ...current,
                      costType: event.target.value,
                    }))
                  }
                  required
                  value={productCostForm.costType}
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-foreground">Valor</span>
                <input
                  className="h-10 rounded-[var(--radius-md)] border border-border bg-surface-strong px-3.5 text-sm text-foreground placeholder:text-muted transition-all duration-[var(--transition-fast)] hover:border-border-strong focus:border-border-focus focus:outline-2 focus:outline-accent/20"
                  onChange={(event) =>
                    setProductCostForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  required
                  type="number"
                  value={productCostForm.amount}
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-foreground">Moeda</span>
                <input
                  className="h-10 rounded-[var(--radius-md)] border border-border bg-surface-strong px-3.5 text-sm text-foreground placeholder:text-muted transition-all duration-[var(--transition-fast)] hover:border-border-strong focus:border-border-focus focus:outline-2 focus:outline-accent/20"
                  onChange={(event) =>
                    setProductCostForm((current) => ({
                      ...current,
                      currency: event.target.value,
                    }))
                  }
                  value={productCostForm.currency}
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-foreground">Inicio da vigencia</span>
                <input
                  className="h-10 rounded-[var(--radius-md)] border border-border bg-surface-strong px-3.5 text-sm text-foreground placeholder:text-muted transition-all duration-[var(--transition-fast)] hover:border-border-strong focus:border-border-focus focus:outline-2 focus:outline-accent/20"
                  onChange={(event) =>
                    setProductCostForm((current) => ({
                      ...current,
                      effectiveFrom: normalizeTextInput(event.target.value),
                    }))
                  }
                  type="date"
                  value={productCostForm.effectiveFrom ?? ""}
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-foreground">Observacoes</span>
                <textarea
                  className="min-h-24 rounded-[var(--radius-md)] border border-border bg-surface-strong px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted transition-all duration-[var(--transition-fast)] hover:border-border-strong focus:border-border-focus focus:outline-2 focus:outline-accent/20"
                  onChange={(event) =>
                    setProductCostForm((current) => ({
                      ...current,
                      notes: normalizeTextInput(event.target.value),
                    }))
                  }
                  value={productCostForm.notes ?? ""}
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={productCostMutation.isPending || productOptions.length === 0}
                  type="submit"
                >
                  {productCostMutation.isPending
                    ? "Salvando..."
                    : editingProductCostId
                      ? "Atualizar custo"
                      : "Criar custo"}
                </Button>
                <Button
                  onClick={() => {
                    setEditingProductCostId(null);
                    setProductCostForm({
                      ...initialProductCostForm,
                      productId: productOptions[0]?.value ?? "",
                    });
                    setShowCostForm(false);
                  }}
                  type="button"
                  variant="secondary"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Formulario de AdCost */}
        {showAdCostForm && (
          <Card>
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-accent">Formulario de anuncio</p>
              <h2 className="text-lg font-semibold text-foreground">
                {editingAdCostId ? "Editar gasto em anuncio" : "Registrar gasto em anuncio"}
              </h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Use para registrar investimento em canal antes dos marketplaces entregarem dados detalhados de anuncios.
              </p>
            </div>
            <form
              className="mt-6 grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                setFeedbackMessage(null);
                adCostMutation.mutate();
              }}
            >
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-foreground">Produto vinculado</span>
                <select
                  className="h-10 rounded-[var(--radius-md)] border border-border bg-surface-strong px-3 text-sm text-foreground transition-all duration-[var(--transition-fast)] hover:border-border-strong focus:border-border-focus focus:outline-2 focus:outline-accent/20"
                  onChange={(event) =>
                    setAdCostForm((current) => ({
                      ...current,
                      productId: event.target.value || null,
                    }))
                  }
                  value={adCostForm.productId ?? ""}
                >
                  <option value="">Sem produto vinculado</option>
                  {productOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-foreground">Canal</span>
                <input
                  className="h-10 rounded-[var(--radius-md)] border border-border bg-surface-strong px-3.5 text-sm text-foreground placeholder:text-muted transition-all duration-[var(--transition-fast)] hover:border-border-strong focus:border-border-focus focus:outline-2 focus:outline-accent/20"
                  onChange={(event) =>
                    setAdCostForm((current) => ({
                      ...current,
                      channel: event.target.value,
                    }))
                  }
                  required
                  value={adCostForm.channel}
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-foreground">Valor</span>
                <input
                  className="h-10 rounded-[var(--radius-md)] border border-border bg-surface-strong px-3.5 text-sm text-foreground placeholder:text-muted transition-all duration-[var(--transition-fast)] hover:border-border-strong focus:border-border-focus focus:outline-2 focus:outline-accent/20"
                  onChange={(event) =>
                    setAdCostForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  required
                  type="number"
                  value={adCostForm.amount}
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-foreground">Moeda</span>
                <input
                  className="h-10 rounded-[var(--radius-md)] border border-border bg-surface-strong px-3.5 text-sm text-foreground placeholder:text-muted transition-all duration-[var(--transition-fast)] hover:border-border-strong focus:border-border-focus focus:outline-2 focus:outline-accent/20"
                  onChange={(event) =>
                    setAdCostForm((current) => ({
                      ...current,
                      currency: event.target.value,
                    }))
                  }
                  value={adCostForm.currency}
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-foreground">Data do gasto</span>
                <input
                  className="h-10 rounded-[var(--radius-md)] border border-border bg-surface-strong px-3.5 text-sm text-foreground placeholder:text-muted transition-all duration-[var(--transition-fast)] hover:border-border-strong focus:border-border-focus focus:outline-2 focus:outline-accent/20"
                  onChange={(event) =>
                    setAdCostForm((current) => ({
                      ...current,
                      spentAt: normalizeTextInput(event.target.value),
                    }))
                  }
                  type="date"
                  value={adCostForm.spentAt ?? ""}
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-foreground">Observacoes</span>
                <textarea
                  className="min-h-24 rounded-[var(--radius-md)] border border-border bg-surface-strong px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted transition-all duration-[var(--transition-fast)] hover:border-border-strong focus:border-border-focus focus:outline-2 focus:outline-accent/20"
                  onChange={(event) =>
                    setAdCostForm((current) => ({
                      ...current,
                      notes: normalizeTextInput(event.target.value),
                    }))
                  }
                  value={adCostForm.notes ?? ""}
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <Button disabled={adCostMutation.isPending} type="submit">
                  {adCostMutation.isPending
                    ? "Salvando..."
                    : editingAdCostId
                      ? "Atualizar gasto"
                      : "Registrar gasto"}
                </Button>
                <Button
                  onClick={() => {
                    setEditingAdCostId(null);
                    setAdCostForm(initialAdCostForm);
                    setShowAdCostForm(false);
                  }}
                  type="button"
                  variant="secondary"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Formulario de Despesa */}
        {showExpenseForm && (
          <Card>
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-accent">Formulario de despesa</p>
              <h2 className="text-lg font-semibold text-foreground">
                {editingManualExpenseId ? "Editar despesa" : "Nova despesa"}
              </h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Registre custos fixos ou eventuais ate que fluxos mais avancados de contabilidade entrem no produto.
              </p>
            </div>
            <form
              className="mt-6 grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                setFeedbackMessage(null);
                manualExpenseMutation.mutate();
              }}
            >
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-foreground">Categoria</span>
                <input
                  className="h-10 rounded-[var(--radius-md)] border border-border bg-surface-strong px-3.5 text-sm text-foreground placeholder:text-muted transition-all duration-[var(--transition-fast)] hover:border-border-strong focus:border-border-focus focus:outline-2 focus:outline-accent/20"
                  onChange={(event) =>
                    setManualExpenseForm((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                  required
                  value={manualExpenseForm.category}
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-foreground">Valor</span>
                <input
                  className="h-10 rounded-[var(--radius-md)] border border-border bg-surface-strong px-3.5 text-sm text-foreground placeholder:text-muted transition-all duration-[var(--transition-fast)] hover:border-border-strong focus:border-border-focus focus:outline-2 focus:outline-accent/20"
                  onChange={(event) =>
                    setManualExpenseForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  required
                  type="number"
                  value={manualExpenseForm.amount}
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-foreground">Moeda</span>
                <input
                  className="h-10 rounded-[var(--radius-md)] border border-border bg-surface-strong px-3.5 text-sm text-foreground placeholder:text-muted transition-all duration-[var(--transition-fast)] hover:border-border-strong focus:border-border-focus focus:outline-2 focus:outline-accent/20"
                  onChange={(event) =>
                    setManualExpenseForm((current) => ({
                      ...current,
                      currency: event.target.value,
                    }))
                  }
                  value={manualExpenseForm.currency}
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-foreground">Data da competencia</span>
                <input
                  className="h-10 rounded-[var(--radius-md)] border border-border bg-surface-strong px-3.5 text-sm text-foreground placeholder:text-muted transition-all duration-[var(--transition-fast)] hover:border-border-strong focus:border-border-focus focus:outline-2 focus:outline-accent/20"
                  onChange={(event) =>
                    setManualExpenseForm((current) => ({
                      ...current,
                      incurredAt: normalizeTextInput(event.target.value),
                    }))
                  }
                  type="date"
                  value={manualExpenseForm.incurredAt ?? ""}
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-foreground">Observacoes</span>
                <textarea
                  className="min-h-24 rounded-[var(--radius-md)] border border-border bg-surface-strong px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted transition-all duration-[var(--transition-fast)] hover:border-border-strong focus:border-border-focus focus:outline-2 focus:outline-accent/20"
                  onChange={(event) =>
                    setManualExpenseForm((current) => ({
                      ...current,
                      notes: normalizeTextInput(event.target.value),
                    }))
                  }
                  value={manualExpenseForm.notes ?? ""}
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <Button disabled={manualExpenseMutation.isPending} type="submit">
                  {manualExpenseMutation.isPending
                    ? "Salvando..."
                    : editingManualExpenseId
                      ? "Atualizar despesa"
                      : "Criar despesa"}
                </Button>
                <Button
                  onClick={() => {
                    setEditingManualExpenseId(null);
                    setManualExpenseForm(initialManualExpenseForm);
                    setShowExpenseForm(false);
                  }}
                  type="button"
                  variant="secondary"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Produtos Sincronizados */}
        {showSyncedProducts && (
          <Card>
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-accent">Mercado Livre</p>
              <h2 className="text-lg font-semibold text-foreground">Produtos sincronizados para revisao</h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Itens sincronizados do Mercado Livre chegam primeiro como candidatos de revisao. Voce decide se vira um novo produto interno, um vinculo com um produto existente ou fica ignorado por enquanto.
              </p>
            </div>
            <div className="mt-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSyncedProducts(false)}
                className="mb-4"
              >
                Voltar ao catalogo
              </Button>
              <p className="rounded-[var(--radius-md)] border border-border bg-background-soft px-4 py-3 text-sm text-muted-foreground">
                Use a pagina de Integracoes para revisar produtos sincronizados em detalhe.
              </p>
            </div>
          </Card>
        )}
      </div>
    );
  };

  return (
    <ProductsActionsProvider value={contextValue}>
      <div className="space-y-6">
        {children}

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              e.target.value = "";
              importProductsMutation.mutate(file);
            }
          }}
        />

        <Modal
          onClose={() => {
            if (!importProductsMutation.isPending) {
              setShowImportInstructionsModal(false);
            }
          }}
          open={showImportInstructionsModal}
          title="Importar produtos"
        >
          <div className="space-y-5">
            <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10">
                <FileSpreadsheet className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Arquivo .XLSX</p>
                <p className="text-xs text-muted-foreground">
                  A planilha deve estar no formato Excel (.xlsx) e conter as colunas na ordem exata abaixo, sem cabeçalhos adicionais
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-accent">Colunas obrigatórias</p>
              <div className="grid gap-2">
                {[
                  { label: "PRODUTO", desc: "Nome do produto" },
                  { label: "SKU", desc: "Código do item" },
                  { label: "PREÇO DE VENDA", desc: "Valor de venda" },
                  { label: "CUSTO UNITÁRIO", desc: "Custo de cada unidade" },
                  { label: "EMBALAGEM", desc: "Custo da embalagem" },
                  { label: "STATUS", desc: "1 para ativo, 0 para inativo" },
                ].map((col) => (
                  <div
                    key={col.label}
                    className="flex items-center justify-between rounded-[var(--radius-md)] border border-border bg-surface-strong/50 px-3.5 py-2.5"
                  >
                    <span className="text-sm font-semibold text-foreground">{col.label}</span>
                    <span className="text-xs text-muted-foreground">{col.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                onClick={() => setShowImportInstructionsModal(false)}
                type="button"
                variant="secondary"
              >
                Cancelar
              </Button>
              <Button
                className="text-white"
                onClick={() => {
                  setShowImportInstructionsModal(false);
                  fileInputRef.current?.click();
                }}
                type="button"
              >
                <Upload className="mr-2 h-4 w-4" />
                Selecionar arquivo
              </Button>
            </div>
          </div>
        </Modal>

        <Modal
          className={importResult && importResult.errors.length > 0 ? "max-w-xl" : undefined}
          onClose={() => {
            if (!importProductsMutation.isPending) {
              setImportResult(null);
            }
          }}
          open={importResult !== null || importProductsMutation.isPending}
          title="Importar produtos"
        >
          <div className="space-y-5">
            {importProductsMutation.isPending ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
                <p className="text-sm text-muted-foreground">Importando produtos...</p>
              </div>
            ) : importResult ? (
              <>
                {/* Resumo */}
                <div
                  className={`flex items-center gap-3 rounded-[var(--radius-lg)] border p-4 ${
                    importResult.imported > 0
                      ? "border-border bg-surface"
                      : "border-warning/15 bg-warning/[0.04]"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      importResult.imported > 0 ? "bg-success/10" : "bg-warning/10"
                    }`}
                  >
                    {importResult.imported > 0 ? (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-warning" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {importResult.imported > 0
                        ? `${importResult.imported} produto${importResult.imported > 1 ? "s" : ""} importado${importResult.imported > 1 ? "s" : ""}`
                        : "Nenhum produto importado"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {importResult.imported > 0
                        ? "Os produtos já estão disponíveis no catálogo."
                        : "Nenhuma linha da planilha foi processada com sucesso."}
                    </p>
                  </div>
                  {importResult.imported > 0 && (
                    <Badge variant="success">{importResult.imported}</Badge>
                  )}
                </div>

                {/* Erros */}
                {importResult.errors.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-error/10">
                          <FileWarning className="h-4 w-4 text-error" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            Erros encontrados
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Corrija os itens abaixo e tente importar novamente.
                          </p>
                        </div>
                      </div>
                      <Badge variant="error">{importResult.errors.length}</Badge>
                    </div>

                    <div className="max-h-64 overflow-y-auto rounded-[var(--radius-xl)] border border-error/10 bg-surface p-2 shadow-[var(--shadow-sm)]">
                      {importResult.errors.map((err, idx) => (
                        <div
                          key={idx}
                          className="group flex items-start gap-3 rounded-[var(--radius-lg)] px-4 py-3.5 transition-colors hover:bg-error-soft/40"
                        >
                          <span className="mt-0.5 shrink-0 rounded-[var(--radius-md)] bg-error/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-error">
                            {err.row === 0 ? "Arquivo" : `Linha ${err.row}`}
                          </span>
                          <span className="text-sm leading-relaxed text-foreground/90">
                            {err.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button onClick={() => setImportResult(null)} variant="secondary">
                    Fechar
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </Modal>

        <Modal
          className="w-[92vw] max-w-2xl"
          onClose={() => {
            if (!manualProductMutation.isPending) {
              setShowManualProductModal(false);
            }
          }}
          open={showManualProductModal}
          title="Novo produto"
        >
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.08 },
              },
            }}
            className="space-y-5 pt-5 pb-2"
          >
            {feedbackMessage ? (
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.35, ease: "easeOut" },
                  },
                }}
                className={`rounded-lg border px-3.5 py-2.5 text-sm ${
                  feedbackTone === "critical"
                    ? "border-error/20 bg-error-soft text-error"
                    : "border-warning/20 bg-warning-soft/30 text-foreground"
                }`}
              >
                {feedbackMessage}
              </motion.div>
            ) : null}

            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                setFeedbackMessage(null);
                manualProductMutation.mutate();
              }}
            >
              <FormSection
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.35, ease: "easeOut" },
                  },
                }}
                title="Identificação"
                description="Informações básicas do produto no catálogo"
                icon={<Tag className="h-4 w-4 text-accent" />}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Nome"
                    onChange={(e) =>
                      setManualProductForm((current) => ({
                        ...current,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Smartphone Galaxy A54"
                    required
                    value={manualProductForm.name}
                  />
                  <Input
                    label="SKU"
                    onChange={(e) =>
                      setManualProductForm((current) => ({
                        ...current,
                        sku: e.target.value.trim(),
                      }))
                    }
                    placeholder="CEL-SMG-A54-001"
                    required
                    value={manualProductForm.sku}
                  />
                </div>
              </FormSection>

              <FormSection
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.35, ease: "easeOut" },
                  },
                }}
                title="Preços e custos"
                description="Valores diretos do produto"
                icon={<DollarSign className="h-4 w-4 text-accent" />}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium text-foreground">Preço de venda</span>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        R$
                      </span>
                      <CurrencyInput
                        onChange={(val) =>
                          setManualProductForm((current) => ({
                            ...current,
                            sellingPrice: val,
                          }))
                        }
                        placeholder="0,00"
                        required
                        value={manualProductForm.sellingPrice}
                      />
                    </div>
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium text-foreground">Custo unitário</span>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        R$
                      </span>
                      <CurrencyInput
                        onChange={(val) =>
                          setManualProductForm((current) => ({
                            ...current,
                            unitCost: val,
                          }))
                        }
                        placeholder="0,00"
                        required
                        value={manualProductForm.unitCost}
                      />
                    </div>
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium text-foreground">Embalagem</span>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        R$
                      </span>
                      <CurrencyInput
                        onChange={(val) =>
                          setManualProductForm((current) => ({
                            ...current,
                            packagingCost: val,
                          }))
                        }
                        placeholder="0,00"
                        required
                        value={manualProductForm.packagingCost}
                      />
                    </div>
                  </label>
                </div>
              </FormSection>

              <PremiumSwitch
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.35, ease: "easeOut" },
                  },
                }}
                checked={manualProductForm.isActive}
                onChange={(checked) =>
                  setManualProductForm((current) => ({
                    ...current,
                    isActive: checked,
                  }))
                }
                icon={<Package className="h-4 w-4" />}
                title="Produto ativo"
                description="Inativos não aparecem nos relatórios"
              />

              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.35, ease: "easeOut" },
                  },
                }}
                className="flex items-center justify-end gap-3 border-t border-border/50 pt-5 pb-5"
              >
                <Button
                  onClick={() => setShowManualProductModal(false)}
                  type="button"
                  variant="ghost"
                >
                  Cancelar
                </Button>
                <Button disabled={manualProductMutation.isPending} type="submit">
                  {manualProductMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar produto"
                  )}
                </Button>
              </motion.div>
            </form>
          </motion.div>
        </Modal>

        {renderForms()}
      </div>
    </ProductsActionsProvider>
  );
}
