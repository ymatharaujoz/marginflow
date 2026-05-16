"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import Link from "next/link";
import { DollarSign, Building2, Package, TrendingUp, Calculator, Check, X, Loader2 } from "lucide-react";
import { Button, Card, Modal } from "@marginflow/ui";
import { companiesApiResponseSchema } from "@marginflow/validation";
import type {
  AdCostFormValues,
  AdCostRecord,
  Company,
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
  formatReferenceMonthPtBr,
  productCatalogQueryKey,
  ProductsHome,
} from "@/modules/products";
import type { ProductInsight } from "@/modules/products";
import {
  getActiveCompanies,
  getManualProductCompanyValidationMessage,
  resolveManualProductCompanyState,
} from "./manual-product-company-state";

const initialProductForm: ProductFormValues = {
  isActive: true,
  name: "",
  sellingPrice: "0.00",
  sku: null,
};

const initialManualProductForm = {
  advertisingCost: "0.00",
  companyId: "",
  isActive: true,
  name: "",
  packagingCost: "0.00",
  sellingPrice: "0.00",
  sku: "",
  taxRate: "0.000000",
  unitCost: "0.00",
};

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

type FeedbackTone = "critical" | "neutral";

type SyncedProductMutationInput = {
  action: "ignore" | "import" | "link";
  externalProductId: string;
  productId?: string;
};

function SectionHeader({
  description,
  eyebrow,
  title,
}: {
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-bold uppercase tracking-wider text-accent">{eyebrow}</p>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function SectionMessage({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: FeedbackTone;
}) {
  return (
    <p
      className={
        tone === "critical"
          ? "rounded-[var(--radius-md)] border border-error/20 bg-error-soft px-4 py-3 text-sm text-foreground"
          : "rounded-[var(--radius-md)] border border-border bg-background-soft px-4 py-3 text-sm text-muted-foreground"
      }
    >
      {children}
    </p>
  );
}

function TextInput({
  label,
  onChange,
  placeholder,
  required = false,
  type = "text",
  value,
  icon,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: "date" | "number" | "text";
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </span>
        )}
        <input
          className={`h-10 rounded-[var(--radius-md)] border border-border bg-surface-strong text-sm text-foreground placeholder:text-muted transition-all duration-[var(--transition-fast)] hover:border-border-strong focus:border-border-focus focus:outline-2 focus:outline-accent/20 ${
            icon ? "pl-10 pr-3.5" : "px-3.5"
          }`}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          step={type === "number" ? "0.01" : undefined}
          type={type}
          value={value}
        />
      </div>
    </label>
  );
}

function CurrencyInput({
  label,
  onChange,
  placeholder,
  required = false,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  value: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          R$
        </span>
        <input
          className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-surface-strong pl-9 pr-3.5 text-sm text-foreground placeholder:text-muted transition-all duration-[var(--transition-fast)] hover:border-border-strong focus:border-border-focus focus:outline-2 focus:outline-accent/20"
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          step="0.01"
          type="number"
          value={value}
        />
      </div>
    </label>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-border bg-surface-strong p-4">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
            checked ? "bg-success/10" : "bg-muted"
          }`}
        >
          <Package className={`h-5 w-5 ${checked ? "text-success" : "text-muted-foreground"}`} />
        </div>
        <div>
          <p className="font-medium text-foreground">{label}</p>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20 ${
          checked ? "bg-accent" : "bg-muted-foreground/30"
        }`}
      >
        <span
          className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function TextArea({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <textarea
        className="min-h-24 rounded-[var(--radius-md)] border border-border bg-surface-strong px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted transition-all duration-[var(--transition-fast)] hover:border-border-strong focus:border-border-focus focus:outline-2 focus:outline-accent/20"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function SelectInput({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <select
        className="h-10 rounded-[var(--radius-md)] border border-border bg-surface-strong px-3 text-sm text-foreground transition-all duration-[var(--transition-fast)] hover:border-border-strong focus:border-border-focus focus:outline-2 focus:outline-accent/20"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function normalizeTextInput(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function translateSyncedProductStatus(status: string) {
  switch (status) {
    case "linked_to_existing_product":
      return "Vinculado";
    case "imported_as_internal_product":
      return "Importado";
    case "ignored":
      return "Ignorado";
    default:
      return "Pendente";
  }
}

function formatMoney(value: string) {
  const numeric = Number(value);

  return Number.isFinite(numeric)
    ? new Intl.NumberFormat("pt-BR", {
        currency: "BRL",
        style: "currency",
      }).format(numeric)
    : value;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Sem data";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Sem histórico";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function translateSuggestedMatchReason(reason: string) {
  if (reason === "sku_exact") {
    return "SKU idêntico";
  }

  return reason;
}

interface ProductsHubProps {
  organizationName: string;
}

export function ProductsHub({ organizationName }: ProductsHubProps) {
  const queryClient = useQueryClient();
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>("neutral");

  // Estados dos formulários
  const [showProductForm, setShowProductForm] = useState(false);
  const [showCostForm, setShowCostForm] = useState(false);
  const [showAdCostForm, setShowAdCostForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showSyncedProducts, setShowSyncedProducts] = useState(false);
  const [showSyncedReviewPanel, setShowSyncedReviewPanel] = useState(false);
  const [showManualProductModal, setShowManualProductModal] = useState(false);
  const [manualProductContextLoading, setManualProductContextLoading] = useState(false);
  const [manualProductReferenceMonth, setManualProductReferenceMonth] = useState("");
  const [companyOptions, setCompanyOptions] = useState<Company[]>([]);
  const activeCompanyOptions = getActiveCompanies(companyOptions);

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

  // Mutações
  const productMutation = useMutation({
    mutationFn: async () => {
      if (editingProductId) {
        return apiClient.patch<{ data: ProductListItem; error: null }>(
          `/products/${editingProductId}`,
          {
            body: productForm,
          }
        );
      }

      return apiClient.post<{ data: ProductListItem; error: null }>("/products", {
        body: productForm,
      });
    },
    onError: (error) => {
      setCriticalFeedback(error, "Não foi possível processar o produto.");
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
          {
            body: productCostForm,
          }
        );
      }

      return apiClient.post<{ data: ProductCostRecord; error: null }>("/costs/products", {
        body: productCostForm,
      });
    },
    onError: (error) => {
      setCriticalFeedback(error, "Não foi possível processar o custo do produto.");
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
          {
            body: adCostForm,
          }
        );
      }

      return apiClient.post<{ data: AdCostRecord; error: null }>("/costs/ads", {
        body: adCostForm,
      });
    },
    onError: (error) => {
      setCriticalFeedback(error, "Não foi possível processar o custo em anúncios.");
    },
    onSuccess: async () => {
      setEditingAdCostId(null);
      setAdCostForm(initialAdCostForm);
      setShowAdCostForm(false);
      await refreshCatalog(
        editingAdCostId ? "Custo em anúncios atualizado." : "Custo em anúncios criado."
      );
    },
  });

  const manualExpenseMutation = useMutation({
    mutationFn: async () => {
      if (editingManualExpenseId) {
        return apiClient.patch<{ data: ManualExpenseRecord; error: null }>(
          `/costs/expenses/${editingManualExpenseId}`,
          {
            body: manualExpenseForm,
          }
        );
      }

      return apiClient.post<{ data: ManualExpenseRecord; error: null }>("/costs/expenses", {
        body: manualExpenseForm,
      });
    },
    onError: (error) => {
      setCriticalFeedback(error, "Não foi possível processar a despesa.");
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
        {
          body: {
            productId: input.productId,
          },
        }
      );
    },
    onError: (error) => {
      setCriticalFeedback(error, "Não foi possível revisar o produto sincronizado.");
    },
    onSuccess: async (response) => {
      await refreshCatalog(response.data.message);
    },
  });

  const manualProductMutation = useMutation({
    mutationFn: async () => {
      const blockingMessage = getManualProductCompanyValidationMessage({
        companies: companyOptions,
        companyId: manualProductForm.companyId,
      });

      if (blockingMessage) {
        throw new Error(blockingMessage);
      }

      return apiClient.post<{ data: ProductManualCreateResult; error: null }>("/products/manual", {
        body: {
          initialFinance: {
            advertisingCost: manualProductForm.advertisingCost,
            packagingCost: manualProductForm.packagingCost,
            taxRate: manualProductForm.taxRate,
            unitCost: manualProductForm.unitCost,
          },
          product: {
            isActive: manualProductForm.isActive,
            name: manualProductForm.name,
            sellingPrice: manualProductForm.sellingPrice,
            sku: manualProductForm.sku,
          },
          scope: {
            channel: "mercadolivre",
            companyId: manualProductForm.companyId,
            referenceMonth: manualProductReferenceMonth,
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

  const fetchCompaniesForSelect = useCallback(async () => {
    return apiClient.getValidatedData("/companies", companiesApiResponseSchema);
  }, []);

  const handleAddProduct = useCallback(
    async (context: { companyId: string | null; referenceMonth: string }) => {
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
      setManualProductContextLoading(true);

      try {
        const companies = await fetchCompaniesForSelect();
        const companyState = resolveManualProductCompanyState({
          companies,
          preferredCompanyId: context.companyId,
        });

        setCompanyOptions(companies);
        setManualProductReferenceMonth(context.referenceMonth);
        setManualProductForm({
          ...initialManualProductForm,
          companyId: companyState.selectedCompanyId,
        });

        if (companyState.blockingMessage) {
          setFeedbackMessage(companyState.blockingMessage);
          setFeedbackTone("critical");
        }
      } catch (error) {
        setCriticalFeedback(error, "Nao foi possivel carregar o contexto do cadastro manual.");
      } finally {
        setManualProductContextLoading(false);
      }
    },
    [fetchCompaniesForSelect],
  );

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
      }, {}),
    );
  }, [fetchProductsForSelect]);

  const handleInsightAction = useCallback(
    (insight: ProductInsight) => {
      if (insight.actionKey === "open-synced-review") {
        void handleOpenSyncedProducts();
        return true;
      }

      return false;
    },
    [handleOpenSyncedProducts],
  );

  // Product options para selects
  const [productOptions, setProductOptions] = useState<Array<{ label: string; value: string }>>([]);

  // Buscar produtos para o select quando necessário
  async function fetchProductsForSelect() {
    const response = await apiClient.get<{ data: ProductListItem[]; error: null }>("/products");
    const products = response.data ?? [];
    setAvailableProducts(products);
    setProductOptions(
      products.map((product) => ({
        label: `${product.name}${product.isActive ? "" : " (arquivado)"}`,
        value: product.id,
      }))
    );
    return products;
  }

  const selectedProductId = productCostForm.productId || productOptions[0]?.value || "";

  // Renderizar formulários modais
  const renderForms = () => {
    if (!showProductForm && !showCostForm && !showAdCostForm && !showExpenseForm && !showSyncedProducts) {
      return null;
    }

    return (
      <div className="mt-6 space-y-6">
        {feedbackMessage ? (
          <div className="mb-4">
            <SectionMessage tone={feedbackTone}>{feedbackMessage}</SectionMessage>
          </div>
        ) : null}

        {/* Formulário de Produto */}
        {showProductForm && (
          <Card>
            <SectionHeader
              description="Use o mesmo fluxo para cadastrar agora ou ajustar depois."
              eyebrow="Produto"
              title={editingProductId ? "Editar produto" : "Criar produto"}
            />
            <form
              className="mt-6 grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                setFeedbackMessage(null);
                productMutation.mutate();
              }}
            >
              <TextInput
                label="Nome do produto"
                onChange={(value) => setProductForm((current) => ({ ...current, name: value }))}
                required
                value={productForm.name}
              />
              <TextInput
                label="SKU"
                onChange={(value) =>
                  setProductForm((current) => ({
                    ...current,
                    sku: normalizeTextInput(value),
                  }))
                }
                value={productForm.sku ?? ""}
              />
              <TextInput
                label="Preço de venda"
                onChange={(value) =>
                  setProductForm((current) => ({
                    ...current,
                    sellingPrice: value,
                  }))
                }
                required
                type="number"
                value={productForm.sellingPrice}
              />
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

        {/* Formulário de Custo de Produto */}
        {showCostForm && (
          <Card>
            <SectionHeader
              description="Cada lançamento fica gravado separadamente para manter conciliações futuras."
              eyebrow="Formulário de custo"
              title={editingProductCostId ? "Editar custo do produto" : "Criar custo do produto"}
            />
            <form
              className="mt-6 grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                setFeedbackMessage(null);
                productCostMutation.mutate();
              }}
            >
              <SelectInput
                label="Produto"
                onChange={(value) =>
                  setProductCostForm((current) => ({
                    ...current,
                    productId: value,
                  }))
                }
                options={
                  productOptions.length > 0
                    ? productOptions
                    : [{ label: "Crie um produto primeiro", value: "" }]
                }
                value={selectedProductId}
              />
              <TextInput
                label="Tipo de custo"
                onChange={(value) =>
                  setProductCostForm((current) => ({
                    ...current,
                    costType: value,
                  }))
                }
                required
                value={productCostForm.costType}
              />
              <TextInput
                label="Valor"
                onChange={(value) =>
                  setProductCostForm((current) => ({
                    ...current,
                    amount: value,
                  }))
                }
                required
                type="number"
                value={productCostForm.amount}
              />
              <TextInput
                label="Moeda"
                onChange={(value) =>
                  setProductCostForm((current) => ({
                    ...current,
                    currency: value,
                  }))
                }
                value={productCostForm.currency}
              />
              <TextInput
                label="Início da vigência"
                onChange={(value) =>
                  setProductCostForm((current) => ({
                    ...current,
                    effectiveFrom: normalizeTextInput(value),
                  }))
                }
                type="date"
                value={productCostForm.effectiveFrom ?? ""}
              />
              <TextArea
                label="Observações"
                onChange={(value) =>
                  setProductCostForm((current) => ({
                    ...current,
                    notes: normalizeTextInput(value),
                  }))
                }
                value={productCostForm.notes ?? ""}
              />
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

        {/* Formulário de AdCost */}
        {showAdCostForm && (
          <Card>
            <SectionHeader
              description="Use para registrar investimento em canal antes dos marketplaces entregarem dados detalhados de anúncios."
              eyebrow="Formulário de anúncio"
              title={editingAdCostId ? "Editar gasto em anúncio" : "Registrar gasto em anúncio"}
            />
            <form
              className="mt-6 grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                setFeedbackMessage(null);
                adCostMutation.mutate();
              }}
            >
              <SelectInput
                label="Produto vinculado"
                onChange={(value) =>
                  setAdCostForm((current) => ({
                    ...current,
                    productId: value || null,
                  }))
                }
                options={[{ label: "Sem produto vinculado", value: "" }, ...productOptions]}
                value={adCostForm.productId ?? ""}
              />
              <TextInput
                label="Canal"
                onChange={(value) =>
                  setAdCostForm((current) => ({
                    ...current,
                    channel: value,
                  }))
                }
                required
                value={adCostForm.channel}
              />
              <TextInput
                label="Valor"
                onChange={(value) =>
                  setAdCostForm((current) => ({
                    ...current,
                    amount: value,
                  }))
                }
                required
                type="number"
                value={adCostForm.amount}
              />
              <TextInput
                label="Moeda"
                onChange={(value) =>
                  setAdCostForm((current) => ({
                    ...current,
                    currency: value,
                  }))
                }
                value={adCostForm.currency}
              />
              <TextInput
                label="Data do gasto"
                onChange={(value) =>
                  setAdCostForm((current) => ({
                    ...current,
                    spentAt: normalizeTextInput(value),
                  }))
                }
                type="date"
                value={adCostForm.spentAt ?? ""}
              />
              <TextArea
                label="Observações"
                onChange={(value) =>
                  setAdCostForm((current) => ({
                    ...current,
                    notes: normalizeTextInput(value),
                  }))
                }
                value={adCostForm.notes ?? ""}
              />
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

        {/* Formulário de Despesa */}
        {showExpenseForm && (
          <Card>
            <SectionHeader
              description="Registre custos fixos ou eventuais até que fluxos mais avançados de contabilidade entrem no produto."
              eyebrow="Formulário de despesa"
              title={editingManualExpenseId ? "Editar despesa" : "Nova despesa"}
            />
            <form
              className="mt-6 grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                setFeedbackMessage(null);
                manualExpenseMutation.mutate();
              }}
            >
              <TextInput
                label="Categoria"
                onChange={(value) =>
                  setManualExpenseForm((current) => ({
                    ...current,
                    category: value,
                  }))
                }
                required
                value={manualExpenseForm.category}
              />
              <TextInput
                label="Valor"
                onChange={(value) =>
                  setManualExpenseForm((current) => ({
                    ...current,
                    amount: value,
                  }))
                }
                required
                type="number"
                value={manualExpenseForm.amount}
              />
              <TextInput
                label="Moeda"
                onChange={(value) =>
                  setManualExpenseForm((current) => ({
                    ...current,
                    currency: value,
                  }))
                }
                value={manualExpenseForm.currency}
              />
              <TextInput
                label="Data da competência"
                onChange={(value) =>
                  setManualExpenseForm((current) => ({
                    ...current,
                    incurredAt: normalizeTextInput(value),
                  }))
                }
                type="date"
                value={manualExpenseForm.incurredAt ?? ""}
              />
              <TextArea
                label="Observações"
                onChange={(value) =>
                  setManualExpenseForm((current) => ({
                    ...current,
                    notes: normalizeTextInput(value),
                  }))
                }
                value={manualExpenseForm.notes ?? ""}
              />
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
            <SectionHeader
              description="Itens sincronizados do Mercado Livre chegam primeiro como candidatos de revisão. Você decide se vira um novo produto interno, um vínculo com um produto existente ou fica ignorado por enquanto."
              eyebrow="Mercado Livre"
              title="Produtos sincronizados para revisão"
            />
            <div className="mt-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSyncedProducts(false)}
                className="mb-4"
              >
                ← Voltar ao catálogo
              </Button>
              {/* Lista de produtos sincronizados seria renderizada aqui */}
              <SectionMessage>
                Use a página de Integrações para revisar produtos sincronizados em detalhe.
              </SectionMessage>
            </div>
          </Card>
        )}
      </div>
    );
  };

  // Carregar opções quando mostrar formulários
  if ((showCostForm || showAdCostForm) && productOptions.length === 0) {
    fetchProductsForSelect();
  }

  return (
    <div className="space-y-6">
      <ProductsHome
        organizationName={organizationName}
        onAddProduct={handleAddProduct}
        onInsightAction={handleInsightAction}
      />

      <Modal
        onClose={() => {
          if (!manualProductMutation.isPending) {
            setShowManualProductModal(false);
          }
        }}
        open={showManualProductModal}
        title="Novo produto"
      >
        <div className="space-y-5">
          {/* Feedback */}
          {feedbackMessage ? (
            <div className={`rounded-lg border px-3 py-2.5 text-sm ${feedbackTone === "critical" ? "border-error/20 bg-error-soft text-error" : "border-warning/20 bg-warning-soft/30 text-foreground"}`}>
              {feedbackMessage}
            </div>
          ) : null}

          {manualProductContextLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : (
            <form
              className="space-y-6"
              onSubmit={(event) => {
                event.preventDefault();
                const blockingMessage = getManualProductCompanyValidationMessage({
                  companies: companyOptions,
                  companyId: manualProductForm.companyId,
                });

                if (blockingMessage) {
                  setFeedbackMessage(blockingMessage);
                  setFeedbackTone("critical");
                  return;
                }

                setFeedbackMessage(null);
                manualProductMutation.mutate();
              }}
            >
              {/* Identificação */}
              <div className="space-y-3 border-b border-border/50 pb-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Identificação</h3>
                  <p className="text-xs text-muted-foreground">Informações básicas do produto no catálogo</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm sm:col-span-2">
                    <span className="font-medium text-foreground">Empresa</span>
                    <select
                      className="h-10 rounded-[var(--radius-md)] border border-border bg-background px-3.5 text-sm text-foreground transition-all hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={activeCompanyOptions.length === 0}
                      onChange={(e) =>
                        setManualProductForm((current) => ({
                          ...current,
                          companyId: e.target.value,
                        }))
                      }
                      required
                      value={manualProductForm.companyId}
                    >
                      <option value="">
                        {activeCompanyOptions.length === 0
                          ? "Cadastre uma empresa ativa primeiro"
                          : "Selecione a empresa"}
                      </option>
                      {activeCompanyOptions.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name} ({company.code})
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      {activeCompanyOptions.length === 0 ? (
                        <Link className="font-medium text-accent hover:underline" href="/app/onboarding">
                          Criar primeira empresa
                        </Link>
                      ) : null}
                    </div>
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium text-foreground">Nome</span>
                    <input
                      className="h-10 rounded-[var(--radius-md)] border border-border bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 transition-all hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                      onChange={(e) => setManualProductForm((current) => ({ ...current, name: e.target.value }))}
                      placeholder="Ex: Smartphone Galaxy A54"
                      required
                      value={manualProductForm.name}
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium text-foreground">SKU</span>
                    <input
                      className="h-10 rounded-[var(--radius-md)] border border-border bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 transition-all hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                      onChange={(e) => setManualProductForm((current) => ({ ...current, sku: e.target.value.trim() }))}
                      placeholder="Ex: CEL-SMG-A54-001"
                      required
                      value={manualProductForm.sku}
                    />
                  </label>
                </div>
              </div>

              {/* Preços e custos */}
              <div className="space-y-3 border-b border-border/50 pb-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Preços e custos</h3>
                  <p className="text-xs text-muted-foreground">Valores que compõem o custo total do produto</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium text-foreground">Preço de venda</span>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                      <input
                        className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-background pl-9 pr-3.5 text-sm text-foreground transition-all hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                        onChange={(e) => setManualProductForm((current) => ({ ...current, sellingPrice: e.target.value }))}
                        placeholder="0,00"
                        required
                        step="0.01"
                        type="number"
                        value={manualProductForm.sellingPrice}
                      />
                    </div>
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium text-foreground">Custo unitário</span>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                      <input
                        className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-background pl-9 pr-3.5 text-sm text-foreground transition-all hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                        onChange={(e) => setManualProductForm((current) => ({ ...current, unitCost: e.target.value }))}
                        placeholder="0,00"
                        required
                        step="0.01"
                        type="number"
                        value={manualProductForm.unitCost}
                      />
                    </div>
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium text-foreground">Embalagem</span>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                      <input
                        className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-background pl-9 pr-3.5 text-sm text-foreground transition-all hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                        onChange={(e) => setManualProductForm((current) => ({ ...current, packagingCost: e.target.value }))}
                        placeholder="0,00"
                        required
                        step="0.01"
                        type="number"
                        value={manualProductForm.packagingCost}
                      />
                    </div>
                  </label>
                </div>
              </div>

              {/* Taxas */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Marketing e impostos</h3>
                  <p className="text-xs text-muted-foreground">Custos variáveis aplicados sobre o produto</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium text-foreground">Publicidade</span>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                      <input
                        className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-background pl-9 pr-3.5 text-sm text-foreground transition-all hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                        onChange={(e) => setManualProductForm((current) => ({ ...current, advertisingCost: e.target.value }))}
                        placeholder="0,00"
                        required
                        step="0.01"
                        type="number"
                        value={manualProductForm.advertisingCost}
                      />
                    </div>
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium text-foreground">Imposto (%)</span>
                    <input
                      className="h-10 rounded-[var(--radius-md)] border border-border bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 transition-all hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                      onChange={(e) => setManualProductForm((current) => ({ ...current, taxRate: e.target.value }))}
                      placeholder="Ex: 0.12 para 12%"
                      required
                      value={manualProductForm.taxRate}
                    />
                  </label>
                </div>
              </div>

              {/* Configurações */}
              <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-border bg-background px-3.5 py-2.5 border-b border-border/50">
                <div className="flex items-center gap-2.5">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${manualProductForm.isActive ? "bg-success/10" : "bg-muted"}`}>
                    <Package className={`h-4 w-4 ${manualProductForm.isActive ? "text-success" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Produto ativo</p>
                    <p className="text-xs text-muted-foreground">Inativos não aparecem nos relatórios</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setManualProductForm((current) => ({ ...current, isActive: !current.isActive }))}
                  className={`relative h-6 w-11 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20 ${manualProductForm.isActive ? "bg-accent" : "bg-muted-foreground/30"}`}
                >
                  <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${manualProductForm.isActive ? "left-1 translate-x-5" : "left-1"}`} />
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/50">
                <Button
                  onClick={() => setShowManualProductModal(false)}
                  type="button"
                  variant="ghost"
                >
                  Cancelar
                </Button>
                <Button
                  className="text-white"
                  disabled={manualProductMutation.isPending || activeCompanyOptions.length === 0}
                  type="submit"
                >
                  {manualProductMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar produto"
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      {showSyncedReviewPanel ? (
        <Card>
          <SectionHeader
            description="Itens sincronizados do Mercado Livre chegam primeiro como candidatos de revisao. Voce decide se vira um novo produto interno, um vinculo com um produto existente ou fica ignorado por enquanto."
            eyebrow="Mercado Livre"
            title="Produtos sincronizados para revisao"
          />
          <div className="mt-6 space-y-4">
            <Button
              className="mb-2"
              onClick={() => setShowSyncedReviewPanel(false)}
              size="sm"
              variant="ghost"
            >
              Voltar ao catalogo
            </Button>

            {availableSyncedProducts.length === 0 ? (
              <SectionMessage>
                Nenhum produto sincronizado pendente de revisao neste momento.
              </SectionMessage>
            ) : (
              availableSyncedProducts.map((item) => (
                <Card key={item.externalProductId} variant="outlined" className="p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.title ?? "Produto sem titulo"}</p>
                        <p className="text-xs text-muted-foreground">
                          SKU: {item.sku ?? "sem SKU"} · status: {translateSyncedProductStatus(item.reviewStatus)}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.unitsSold} unidades · {item.orderCount} pedido(s) · {formatMoney(item.grossRevenue)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Comissao: {formatMoney(item.marketplaceCommission)} · Taxa fixa: {formatMoney(item.fixedFee)} · Frete: {formatMoney(item.shippingCost)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Total que ficou para o Mercado Livre: {formatMoney(item.netMarketplaceTake)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Ultimo pedido: {formatDateTime(item.lastOrderedAt)}
                      </p>
                      {item.linkedProduct ? (
                        <SectionMessage>
                          Vinculado a {item.linkedProduct.name}
                          {item.linkedProduct.sku ? ` (${item.linkedProduct.sku})` : ""}.
                        </SectionMessage>
                      ) : null}
                      {item.suggestedMatches.length > 0 ? (
                        <SectionMessage>
                          Sugestao principal: {item.suggestedMatches[0]?.name}
                          {item.suggestedMatches[0]?.sku ? ` (${item.suggestedMatches[0]?.sku})` : ""}
                          {" "}por {translateSuggestedMatchReason(item.suggestedMatches[0]?.reason ?? "sku_exact")}.
                        </SectionMessage>
                      ) : null}
                    </div>

                    <div className="w-full max-w-sm space-y-3">
                      <label className="grid gap-1.5 text-sm">
                        <span className="font-medium text-foreground">Vincular a produto existente</span>
                        <select
                          className="h-10 rounded-[var(--radius-md)] border border-border bg-surface-strong px-3 text-sm text-foreground transition-all duration-[var(--transition-fast)] hover:border-border-strong focus:border-border-focus focus:outline-2 focus:outline-accent/20"
                          onChange={(event) =>
                            setLinkSelections((current) => ({
                              ...current,
                              [item.externalProductId]: event.target.value,
                            }))
                          }
                          value={linkSelections[item.externalProductId] ?? ""}
                        >
                          <option value="">Selecione um produto</option>
                          {availableProducts.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name}{product.sku ? ` (${product.sku})` : ""}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          disabled={syncedProductMutation.isPending || !linkSelections[item.externalProductId]}
                          onClick={() =>
                            syncedProductMutation.mutate({
                              action: "link",
                              externalProductId: item.externalProductId,
                              productId: linkSelections[item.externalProductId],
                            })
                          }
                          type="button"
                          variant="secondary"
                        >
                          Vincular
                        </Button>
                        <Button
                          disabled={syncedProductMutation.isPending}
                          onClick={() =>
                            syncedProductMutation.mutate({
                              action: "import",
                              externalProductId: item.externalProductId,
                            })
                          }
                          type="button"
                        >
                          Importar
                        </Button>
                        <Button
                          disabled={syncedProductMutation.isPending}
                          onClick={() =>
                            syncedProductMutation.mutate({
                              action: "ignore",
                              externalProductId: item.externalProductId,
                            })
                          }
                          type="button"
                          variant="ghost"
                        >
                          Ignorar
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </Card>
      ) : null}

      {renderForms()}
    </div>
  );
}
