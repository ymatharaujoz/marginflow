"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import {
  Package,
  Loader2,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileWarning,
  FileSpreadsheet,
  Store,
  Tag,
  DollarSign,
  Search,
  RefreshCw,
  Minus,
} from "lucide-react";
import { Badge, Button, Card, Input, Modal, cn } from "@lucreii/ui";
import type {
  AdCostFormValues,
  AdCostRecord,
  ManualExpenseFormValues,
  ManualExpenseRecord,
  IntegrationConnectionRecord,
  MarketplaceCatalogImportResult,
  ProductCostFormValues,
  ProductCostRecord,
  ProductFormValues,
  ProductListItem,
  ProductManualCreateResult,
  SyncedProductActionResult,
  SyncedProductRecord,
} from "@lucreii/types";
import { ApiClientError, apiClient } from "@/lib/api/client";
import {
  fetchProductCatalog,
  productCatalogQueryKey,
} from "@/modules/products";
import type { ProductInsight } from "@/modules/products";
import { ProductsActionsProvider } from "./products-actions-context";
import type {
  FeedbackTone,
  SyncedProductMutationInput,
} from "./products-actions-context";
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
      : "",
  );

  useEffect(() => {
    setText(
      value
        ? Number(value).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : "",
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
        : "",
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

function FormSection({
  title,
  description,
  icon,
  children,
  variants,
}: FormSectionProps) {
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

function PremiumSwitch({
  checked,
  onChange,
  icon,
  title,
  description,
  variants,
}: PremiumSwitchProps) {
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
            checked
              ? "bg-accent/10 text-accent"
              : "bg-muted text-muted-foreground",
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
          checked ? "bg-accent" : "bg-muted-foreground/30",
        )}
      >
        <span
          className={cn(
            "absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </button>
    </motion.div>
  );
}

/* ─── Premium Import Modal Components ─── */

type ImportOptionCardProps = {
  icon: React.ReactNode;
  iconBgClass: string;
  title: string;
  description: string;
  badge?: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  index?: number;
};

function ImportOptionCard({
  icon,
  iconBgClass,
  title,
  description,
  badge,
  disabled,
  onClick,
  index = 0,
}: ImportOptionCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.1,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={disabled ? undefined : { y: -2, transition: { duration: 0.2 } }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      type="button"
      className={cn(
        "group relative flex w-full items-start gap-4 rounded-[var(--radius-xl)] border p-5 text-left transition-all duration-300",
        "border-border/40 bg-gradient-to-br from-surface/90 via-surface-strong/40 to-background/20 shadow-[var(--shadow-xs)]",
        "hover:border-border/60 hover:shadow-[var(--shadow-md)] hover:from-surface hover:via-surface-strong/50 hover:to-background/30",
        disabled && "cursor-not-allowed opacity-60 hover:border-border/40 hover:shadow-[var(--shadow-xs)]",
      )}
    >
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-lg)] ring-1 transition-all duration-300",
          iconBgClass,
          !disabled && "group-hover:scale-105",
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {badge}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground/5 text-muted-foreground opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:bg-accent/10 group-hover:text-accent">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </motion.button>
  );
}

type ColumnRequirementRowProps = {
  label: string;
  description: string;
  index?: number;
};

function ColumnRequirementRow({
  label,
  description,
  index = 0,
}: ColumnRequirementRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.35,
        delay: index * 0.05,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="flex items-center justify-between rounded-[var(--radius-lg)] border border-border/50 bg-surface-strong/50 px-4 py-3 transition-colors duration-200 hover:border-border/80 hover:bg-surface-strong/80"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/10 text-[10px] font-bold text-accent ring-1 ring-accent/20">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="text-sm font-semibold text-foreground">{label}</span>
      </div>
      <span className="text-xs text-muted-foreground">{description}</span>
    </motion.div>
  );
}

type ImportConfirmationCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
};

function ImportConfirmationCard({
  icon,
  title,
  description,
  children,
}: ImportConfirmationCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-[var(--radius-xl)] border border-border/40 bg-gradient-to-br from-accent/[0.02] via-surface-strong/40 to-background/20 p-5 shadow-[var(--shadow-xs)]"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 ring-1 ring-warning/20">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
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
  const [showImportInstructionsModal, setShowImportInstructionsModal] =
    useState(false);
  const [
    showSpreadsheetInstructionsModal,
    setShowSpreadsheetInstructionsModal,
  ] = useState(false);
  const [showMercadoLivreConfirmation, setShowMercadoLivreConfirmation] =
    useState(false);
  const [mercadoLivreConnection, setMercadoLivreConnection] =
    useState<IntegrationConnectionRecord | null>(null);
  const [marketplaceImportResult, setMarketplaceImportResult] =
    useState<MarketplaceCatalogImportResult | null>(null);
  const [importResult, setImportResult] = useState<{
    imported: number;
    errors: Array<{ row: number; message: string }>;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [productForm, setProductForm] = useState(initialProductForm);
  const [manualProductForm, setManualProductForm] = useState(
    initialManualProductForm,
  );
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productCostForm, setProductCostForm] = useState(
    initialProductCostForm,
  );
  const [editingProductCostId, setEditingProductCostId] = useState<
    string | null
  >(null);
  const [adCostForm, setAdCostForm] = useState(initialAdCostForm);
  const [editingAdCostId, setEditingAdCostId] = useState<string | null>(null);
  const [manualExpenseForm, setManualExpenseForm] = useState(
    initialManualExpenseForm,
  );
  const [editingManualExpenseId, setEditingManualExpenseId] = useState<
    string | null
  >(null);
  const [linkSelections, setLinkSelections] = useState<Record<string, string>>(
    {},
  );
  const [availableProducts, setAvailableProducts] = useState<ProductListItem[]>(
    [],
  );
  const [availableSyncedProducts, setAvailableSyncedProducts] = useState<
    SyncedProductRecord[]
  >([]);
  const catalogCompanyRequirementMessage =
    getCatalogCompanyRequirementMessage(activeCompanyCount);

  async function refreshCatalog(
    message?: string,
    tone: FeedbackTone = "neutral",
  ) {
    await queryClient.invalidateQueries({ queryKey: productCatalogQueryKey });
    if (message) {
      setFeedbackMessage(message);
      setFeedbackTone(tone);
    }
  }

  function setCriticalFeedback(error: unknown, fallback: string) {
    setFeedbackMessage(
      error instanceof ApiClientError ? error.message : fallback,
    );
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
          { body: productForm },
        );
      }
      return apiClient.post<{ data: ProductListItem; error: null }>(
        "/products",
        {
          body: productForm,
        },
      );
    },
    onError: (error) => {
      setCriticalFeedback(error, "Nao foi possivel processar o produto.");
    },
    onSuccess: async () => {
      setEditingProductId(null);
      setProductForm(initialProductForm);
      setShowProductForm(false);
      await refreshCatalog(
        editingProductId ? "Produto atualizado." : "Produto criado.",
      );
    },
  });

  const productCostMutation = useMutation({
    mutationFn: async () => {
      if (editingProductCostId) {
        return apiClient.patch<{ data: ProductCostRecord; error: null }>(
          `/costs/products/${editingProductCostId}`,
          { body: productCostForm },
        );
      }
      return apiClient.post<{ data: ProductCostRecord; error: null }>(
        "/costs/products",
        {
          body: productCostForm,
        },
      );
    },
    onError: (error) => {
      setCriticalFeedback(
        error,
        "Nao foi possivel processar o custo do produto.",
      );
    },
    onSuccess: async () => {
      setEditingProductCostId(null);
      setProductCostForm(initialProductCostForm);
      setShowCostForm(false);
      await refreshCatalog(
        editingProductCostId
          ? "Custo do produto atualizado."
          : "Custo do produto criado.",
      );
    },
  });

  const adCostMutation = useMutation({
    mutationFn: async () => {
      if (editingAdCostId) {
        return apiClient.patch<{ data: AdCostRecord; error: null }>(
          `/costs/ads/${editingAdCostId}`,
          { body: adCostForm },
        );
      }
      return apiClient.post<{ data: AdCostRecord; error: null }>("/costs/ads", {
        body: adCostForm,
      });
    },
    onError: (error) => {
      setCriticalFeedback(
        error,
        "Nao foi possivel processar o custo em anuncios.",
      );
    },
    onSuccess: async () => {
      setEditingAdCostId(null);
      setAdCostForm(initialAdCostForm);
      setShowAdCostForm(false);
      await refreshCatalog(
        editingAdCostId
          ? "Custo em anuncios atualizado."
          : "Custo em anuncios criado.",
      );
    },
  });

  const manualExpenseMutation = useMutation({
    mutationFn: async () => {
      if (editingManualExpenseId) {
        return apiClient.patch<{ data: ManualExpenseRecord; error: null }>(
          `/costs/expenses/${editingManualExpenseId}`,
          { body: manualExpenseForm },
        );
      }
      return apiClient.post<{ data: ManualExpenseRecord; error: null }>(
        "/costs/expenses",
        {
          body: manualExpenseForm,
        },
      );
    },
    onError: (error) => {
      setCriticalFeedback(error, "Nao foi possivel processar a despesa.");
    },
    onSuccess: async () => {
      setEditingManualExpenseId(null);
      setManualExpenseForm(initialManualExpenseForm);
      setShowExpenseForm(false);
      await refreshCatalog(
        editingManualExpenseId ? "Despesa atualizada." : "Despesa criada.",
      );
    },
  });

  const syncedProductMutation = useMutation({
    mutationFn: async (input: SyncedProductMutationInput) => {
      if (input.action === "import") {
        return apiClient.post<{ data: SyncedProductActionResult; error: null }>(
          `/integrations/mercadolivre/products/${input.externalProductId}/import`,
        );
      }
      if (input.action === "ignore") {
        return apiClient.post<{ data: SyncedProductActionResult; error: null }>(
          `/integrations/mercadolivre/products/${input.externalProductId}/ignore`,
        );
      }
      return apiClient.post<{ data: SyncedProductActionResult; error: null }>(
        `/integrations/mercadolivre/products/${input.externalProductId}/link`,
        { body: { productId: input.productId } },
      );
    },
    onError: (error) => {
      setCriticalFeedback(
        error,
        "Nao foi possivel revisar o produto sincronizado.",
      );
    },
    onSuccess: async (response) => {
      await refreshCatalog(response.data.message);
    },
  });

  const manualProductMutation = useMutation({
    mutationFn: async () => {
      if (blockCatalogCreationIfCompanyRuleFails()) {
        throw new Error(
          catalogCompanyRequirementMessage ?? "Empresa ativa inválida.",
        );
      }
      return apiClient.post<{ data: ProductManualCreateResult; error: null }>(
        "/products/manual",
        {
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
        },
      );
    },
    onError: (error) => {
      setCriticalFeedback(
        error,
        "Nao foi possivel cadastrar o produto manual.",
      );
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
        throw new Error(
          catalogCompanyRequirementMessage ?? "Empresa ativa inválida.",
        );
      }
      const formData = new FormData();
      formData.append("file", file);
      return apiClient.post<{
        data: {
          imported: number;
          errors: Array<{ row: number; message: string }>;
        };
        error: null;
      }>("/products/import", { body: formData });
    },
    onError: (error) => {
      setImportResult({
        imported: 0,
        errors: [
          {
            row: 0,
            message:
              error instanceof ApiClientError
                ? error.message
                : "Erro ao importar planilha.",
          },
        ],
      });
    },
    onSuccess: async (response) => {
      setImportResult(response.data);
      if (response.data.imported > 0) {
        await queryClient.invalidateQueries({
          queryKey: productCatalogQueryKey,
        });
      }
    },
  });

  const importSourcesMutation = useMutation({
    mutationFn: () =>
      apiClient.get<{ data: IntegrationConnectionRecord[]; error: null }>(
        "/integrations",
      ),
    onError: (error) => {
      setCriticalFeedback(error, "Nao foi possivel consultar as integracoes.");
    },
    onSuccess: (response) => {
      setMercadoLivreConnection(
        response.data.find(
          (connection) => connection.provider === "mercadolivre",
        ) ?? null,
      );
    },
  });

  const marketplaceCatalogImportMutation = useMutation({
    mutationFn: () =>
      apiClient.post<{ data: MarketplaceCatalogImportResult; error: null }>(
        "/integrations/mercadolivre/catalog/import",
      ),
    onError: (error) => {
      setShowMercadoLivreConfirmation(false);
      setMarketplaceImportResult({
        conflicts: [],
        created: 0,
        errors: [
          {
            externalProductId: "catalog",
            message:
              error instanceof ApiClientError
                ? error.message
                : "Erro ao importar catalogo do Mercado Livre.",
            sku: "",
          },
        ],
        found: 0,
        unchanged: 0,
        updated: 0,
      });
    },
    onSuccess: async (response) => {
      setShowMercadoLivreConfirmation(false);
      setMarketplaceImportResult(response.data);
      await queryClient.invalidateQueries({ queryKey: productCatalogQueryKey });
    },
  });

  const handleImportProducts = useCallback(() => {
    if (blockCatalogCreationIfCompanyRuleFails()) {
      return;
    }
    setShowImportInstructionsModal(true);
    importSourcesMutation.mutate();
  }, [blockCatalogCreationIfCompanyRuleFails, importSourcesMutation]);

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
    [blockCatalogCreationIfCompanyRuleFails],
  );

  async function fetchProductsForSelect() {
    const response = await apiClient.get<{
      data: ProductListItem[];
      error: null;
    }>("/products");
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
      }, {}),
    );
  }, []);

  const [productOptions, setProductOptions] = useState<
    Array<{ label: string; value: string }>
  >([]);

  // Atualizar productOptions quando availableProducts mudar
  useEffect(() => {
    setProductOptions(
      availableProducts.map((product) => ({
        label: `${product.name}${product.isActive ? "" : " (arquivado)"}`,
        value: product.id,
      })),
    );
  }, [availableProducts]);

  if ((showCostForm || showAdCostForm) && productOptions.length === 0) {
    void fetchProductsForSelect();
  }

  const selectedProductId =
    productCostForm.productId || productOptions[0]?.value || "";

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
              <p className="text-xs font-bold uppercase tracking-wider text-accent">
                Produto
              </p>
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
                <span className="font-medium text-foreground">
                  Nome do produto
                </span>
                <input
                  className="h-10 rounded-[var(--radius-md)] border border-border bg-surface-strong px-3.5 text-sm text-foreground placeholder:text-muted transition-all duration-[var(--transition-fast)] hover:border-border-strong focus:border-border-focus focus:outline-2 focus:outline-accent/20"
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
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
                <span className="font-medium text-foreground">
                  Preco de venda
                </span>
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
              <p className="text-xs font-bold uppercase tracking-wider text-accent">
                Formulario de custo
              </p>
              <h2 className="text-lg font-semibold text-foreground">
                {editingProductCostId
                  ? "Editar custo do produto"
                  : "Criar custo do produto"}
              </h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Cada lancamento fica gravado separadamente para manter
                conciliacoes futuras.
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
                    : [
                        <option key="empty" value="">
                          Crie um produto primeiro
                        </option>,
                      ]}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-foreground">
                  Tipo de custo
                </span>
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
                <span className="font-medium text-foreground">
                  Inicio da vigencia
                </span>
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
                  disabled={
                    productCostMutation.isPending || productOptions.length === 0
                  }
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
              <p className="text-xs font-bold uppercase tracking-wider text-accent">
                Formulario de anuncio
              </p>
              <h2 className="text-lg font-semibold text-foreground">
                {editingAdCostId
                  ? "Editar gasto em anuncio"
                  : "Registrar gasto em anuncio"}
              </h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Use para registrar investimento em canal antes dos marketplaces
                entregarem dados detalhados de anuncios.
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
                <span className="font-medium text-foreground">
                  Produto vinculado
                </span>
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
                <span className="font-medium text-foreground">
                  Data do gasto
                </span>
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
              <p className="text-xs font-bold uppercase tracking-wider text-accent">
                Formulario de despesa
              </p>
              <h2 className="text-lg font-semibold text-foreground">
                {editingManualExpenseId ? "Editar despesa" : "Nova despesa"}
              </h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Registre custos fixos ou eventuais ate que fluxos mais avancados
                de contabilidade entrem no produto.
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
                <span className="font-medium text-foreground">
                  Data da competencia
                </span>
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
                <Button
                  disabled={manualExpenseMutation.isPending}
                  type="submit"
                >
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
              <p className="text-xs font-bold uppercase tracking-wider text-accent">
                Mercado Livre
              </p>
              <h2 className="text-lg font-semibold text-foreground">
                Produtos sincronizados para revisao
              </h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Itens sincronizados do Mercado Livre chegam primeiro como
                candidatos de revisao. Voce decide se vira um novo produto
                interno, um vinculo com um produto existente ou fica ignorado
                por enquanto.
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
                Use a pagina de Integracoes para revisar produtos sincronizados
                em detalhe.
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
            if (!importSourcesMutation.isPending) {
              setShowImportInstructionsModal(false);
            }
          }}
          open={showImportInstructionsModal}
          title="Importar produtos"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-7"
          >
            <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-border/40 bg-gradient-to-br from-accent/[0.02] via-surface-strong/40 to-background/20 p-4 shadow-[var(--shadow-xs)]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 ring-1 ring-accent/20">
                <Upload className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Selecione a origem
                </p>
                <p className="text-xs text-muted-foreground">
                  Escolha de onde os produtos serão importados para o catálogo.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <ImportOptionCard
                index={0}
                icon={<Store className="h-5 w-5 text-warning" />}
                iconBgClass="bg-warning/10 ring-warning/20"
                title="Mercado Livre"
                description="Importa anúncios ativos e pausados, variações, preços e fotos sem duplicar produtos."
                disabled={importSourcesMutation.isPending}
                onClick={() => {
                  if (mercadoLivreConnection?.status === "connected") {
                    setShowImportInstructionsModal(false);
                    setShowMercadoLivreConfirmation(true);
                    return;
                  }
                  setShowImportInstructionsModal(false);
                  router.push("/app/integrations");
                }}
                badge={
                  <Badge
                    variant={
                      mercadoLivreConnection?.status === "connected"
                        ? "success"
                        : "neutral"
                    }
                  >
                    {importSourcesMutation.isPending
                      ? "Consultando"
                      : mercadoLivreConnection?.status === "connected"
                        ? "Conectado"
                        : "Conectar"}
                  </Badge>
                }
              />
              <ImportOptionCard
                index={1}
                icon={<FileSpreadsheet className="h-5 w-5 text-accent" />}
                iconBgClass="bg-accent/10 ring-accent/20"
                title="Planilha Excel"
                description="Mantém o fluxo atual de importação por arquivo .xlsx com colunas padronizadas."
                onClick={() => {
                  setShowImportInstructionsModal(false);
                  setShowSpreadsheetInstructionsModal(true);
                }}
              />
            </div>
          </motion.div>
        </Modal>

        <Modal
          onClose={() => {
            if (!importProductsMutation.isPending) {
              setShowSpreadsheetInstructionsModal(false);
            }
          }}
          open={showSpreadsheetInstructionsModal}
          title="Importar por planilha"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-7"
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-start gap-4 rounded-[var(--radius-xl)] border border-border/40 bg-gradient-to-br from-accent/[0.02] via-surface-strong/40 to-background/20 p-5 shadow-[var(--shadow-xs)]"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-accent/10 ring-1 ring-accent/20">
                <FileSpreadsheet className="h-5 w-5 text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-foreground">
                  Arquivo .XLSX
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  A planilha deve estar no formato Excel (.xlsx) e conter as
                  colunas na ordem exata abaixo, sem cabeçalhos adicionais.
                </p>
              </div>
            </motion.div>

            <div className="space-y-3">
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.3 }}
                className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent"
              >
                Colunas obrigatórias
              </motion.p>
              <div className="space-y-2">
                {[
                  { label: "PRODUTO", desc: "Nome do produto" },
                  { label: "SKU", desc: "Código do item" },
                  { label: "PREÇO DE VENDA", desc: "Valor de venda" },
                  { label: "CUSTO UNITÁRIO", desc: "Custo de cada unidade" },
                  { label: "EMBALAGEM", desc: "Custo da embalagem" },
                  { label: "STATUS", desc: "1 para ativo, 0 para inativo" },
                ].map((col, idx) => (
                  <ColumnRequirementRow
                    key={col.label}
                    index={idx}
                    label={col.label}
                    description={col.desc}
                  />
                ))}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              className="flex items-center justify-end gap-3 pt-2"
            >
              <Button
                onClick={() => setShowSpreadsheetInstructionsModal(false)}
                type="button"
                variant="secondary"
              >
                Cancelar
              </Button>
              <Button
                className="text-white"
                onClick={() => {
                  setShowSpreadsheetInstructionsModal(false);
                  fileInputRef.current?.click();
                }}
                type="button"
              >
                <Upload className="mr-2 h-4 w-4" />
                Selecionar arquivo
              </Button>
            </motion.div>
          </motion.div>
        </Modal>

        <Modal
          onClose={() => {
            if (!marketplaceCatalogImportMutation.isPending) {
              setShowMercadoLivreConfirmation(false);
            }
          }}
          open={showMercadoLivreConfirmation}
          title="Importar do Mercado Livre"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-7"
          >
            <ImportConfirmationCard
              icon={<AlertTriangle className="h-5 w-5 text-warning" />}
              title="Importar todos os anúncios elegíveis?"
              description="Confirme para iniciar a importação do catálogo."
            >
              <div className="space-y-2.5 rounded-[var(--radius-lg)] bg-surface-strong/50 p-4">
                {[
                  "Anúncios ativos e pausados serão importados",
                  "Produtos com SKU existente serão vinculados e atualizados",
                  "Variações viram itens separados",
                  "As fotos permanecem hospedadas pelo Mercado Livre",
                ].map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: 0.2 + idx * 0.06,
                      duration: 0.3,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="flex items-start gap-2.5"
                  >
                    <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent/10">
                      <CheckCircle2 className="h-2.5 w-2.5 text-accent" />
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {item}
                    </p>
                  </motion.div>
                ))}
              </div>
            </ImportConfirmationCard>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              className="flex justify-end gap-3"
            >
              <Button
                disabled={marketplaceCatalogImportMutation.isPending}
                onClick={() => setShowMercadoLivreConfirmation(false)}
                variant="secondary"
              >
                Cancelar
              </Button>
              <Button
                disabled={marketplaceCatalogImportMutation.isPending}
                onClick={() => marketplaceCatalogImportMutation.mutate()}
              >
                {marketplaceCatalogImportMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando catálogo...
                  </>
                ) : (
                  "Importar catálogo"
                )}
              </Button>
            </motion.div>
          </motion.div>
        </Modal>

        <Modal
          className="max-w-2xl"
          onClose={() => {
            if (!marketplaceCatalogImportMutation.isPending) {
              setMarketplaceImportResult(null);
              setShowMercadoLivreConfirmation(false);
            }
          }}
          open={marketplaceImportResult !== null}
          title="Resultado da importação"
        >
          {marketplaceImportResult ? (() => {
            const hasIssues =
              marketplaceImportResult.conflicts.length > 0 ||
              marketplaceImportResult.errors.length > 0;

            return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Hero Card */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  "relative overflow-hidden rounded-[var(--radius-2xl)] border p-8 text-center",
                  hasIssues
                    ? "border-warning/30 bg-gradient-to-br from-warning-soft/20 via-surface/60 to-background"
                    : "border-success/30 bg-gradient-to-br from-success-soft/20 via-surface/60 to-background",
                )}
              >
                {/* Icon */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: 0.1,
                    duration: 0.5,
                    ease: [0.34, 1.56, 0.64, 1],
                  }}
                  className={cn(
                    "mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full ring-2",
                    hasIssues
                      ? "bg-warning/10 ring-warning/20"
                      : "bg-success/10 ring-success/20",
                  )}
                >
                  {hasIssues ? (
                    <AlertTriangle
                      className="h-8 w-8 text-warning"
                      strokeWidth={1.5}
                    />
                  ) : (
                    <CheckCircle2
                      className="h-8 w-8 text-success"
                      strokeWidth={1.5}
                    />
                  )}
                </motion.div>

                {/* Title */}
                <motion.h3
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  className="text-xl font-semibold tracking-tight text-foreground"
                >
                  {hasIssues
                    ? "Importação com ressalvas"
                    : "Importação concluída"}
                </motion.h3>

                {/* Subtitle */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25, duration: 0.3 }}
                  className="mt-2 text-sm text-muted-foreground"
                >
                  {marketplaceImportResult.found} produto
                  {marketplaceImportResult.found !== 1 ? "s" : ""} do Mercado Livre
                  processado{marketplaceImportResult.found !== 1 ? "s" : ""}
                </motion.p>

                {/* Divider */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="mx-auto mt-6 h-px w-32 bg-border/40"
                />
              </motion.div>

              {/* Bento Grid Stats */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="grid grid-cols-4 gap-3"
              >
                {[
                  {
                    label: "Encontrados",
                    value: marketplaceImportResult.found,
                    icon: <Search className="h-5 w-5" strokeWidth={1.5} />,
                  },
                  {
                    label: "Criados",
                    value: marketplaceImportResult.created,
                    icon: <CheckCircle2 className="h-5 w-5" strokeWidth={1.5} />,
                  },
                  {
                    label: "Atualizados",
                    value: marketplaceImportResult.updated,
                    icon: <RefreshCw className="h-5 w-5" strokeWidth={1.5} />,
                  },
                  {
                    label: "Sem alteração",
                    value: marketplaceImportResult.unchanged,
                    icon: <Minus className="h-5 w-5" strokeWidth={1.5} />,
                  },
                ].map((stat, idx) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: 0.2 + idx * 0.08,
                      duration: 0.35,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="relative flex flex-col justify-center rounded-[var(--radius-xl)] border border-border/60 bg-surface p-5"
                  >
                    <div className="absolute top-3 right-3 text-muted-foreground/30">
                      {stat.icon}
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">
                      {stat.label}
                    </p>
                    <p
                      className={cn(
                        "mt-2 text-3xl font-bold tabular-nums tracking-tight text-foreground",
                        stat.value === 0 && "text-muted-foreground/40",
                      )}
                    >
                      {stat.value}
                    </p>
                  </motion.div>
                ))}
              </motion.div>

              {/* Conflicts & Errors Panel */}
              {hasIssues ? (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="rounded-[var(--radius-xl)] border border-warning/20 bg-surface p-5 shadow-[var(--shadow-xs)]"
                >
                  {/* Panel Header */}
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10 ring-1 ring-warning/20">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          Conflitos e erros
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Revise os itens abaixo para resolver as pendências.
                        </p>
                      </div>
                    </div>
                    <Badge variant="warning">
                      {marketplaceImportResult.conflicts.length +
                        marketplaceImportResult.errors.length}
                    </Badge>
                  </div>

                  {/* Divider */}
                  <div className="mb-4 h-px bg-border/40" />

                  {/* Scrollable List */}
                  <div className="max-h-52 space-y-1 overflow-y-auto mf-scrollbar">
                    {[
                      ...marketplaceImportResult.conflicts,
                      ...marketplaceImportResult.errors,
                    ].map((issue, idx) => (
                      <motion.div
                        key={`${issue.externalProductId}:${issue.message}:${idx}`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: 0.35 + idx * 0.05,
                          duration: 0.3,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        className="flex items-start gap-3 rounded-[var(--radius-md)] px-3 py-2.5 transition-colors hover:bg-error-soft/30"
                      >
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-border-strong" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {issue.sku || issue.externalProductId}
                          </p>
                          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                            {issue.message}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ) : null}

              {/* Footer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.3 }}
                className="flex justify-end pt-2"
              >
                <Button
                  onClick={() => {
                    setMarketplaceImportResult(null);
                    setShowMercadoLivreConfirmation(false);
                  }}
                  variant="secondary"
                  className="rounded-full px-6 py-2.5"
                >
                  Fechar
                </Button>
              </motion.div>
            </motion.div>
            );
          })() : null}
        </Modal>

        <Modal
          className={
            importResult && importResult.errors.length > 0
              ? "max-w-xl"
              : undefined
          }
          onClose={() => {
            if (!importProductsMutation.isPending) {
              setImportResult(null);
            }
          }}
          open={importResult !== null || importProductsMutation.isPending}
          title="Importar produtos"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-7"
          >
            {importProductsMutation.isPending ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4 py-10"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-xl)] bg-accent/10 ring-1 ring-accent/20">
                  <Loader2 className="h-7 w-7 animate-spin text-accent" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">
                    Importando produtos...
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Processando linhas da planilha
                  </p>
                </div>
              </motion.div>
            ) : importResult ? (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className={`flex items-center gap-4 rounded-[var(--radius-xl)] border p-5 ${
                    importResult.imported > 0
                      ? "border-border/40 bg-gradient-to-br from-success-soft/30 via-surface-strong/40 to-background/20 shadow-[var(--shadow-xs)]"
                      : "border-warning/20 bg-gradient-to-br from-warning-soft/30 via-surface-strong/40 to-background/20 shadow-[var(--shadow-xs)]"
                  }`}
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-lg)] ring-1 ${
                      importResult.imported > 0
                        ? "bg-success/10 ring-success/20"
                        : "bg-warning/10 ring-warning/20"
                    }`}
                  >
                    {importResult.imported > 0 ? (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-warning" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {importResult.imported > 0
                        ? `${importResult.imported} produto${importResult.imported > 1 ? "s" : ""} importado${importResult.imported > 1 ? "s" : ""}`
                        : "Nenhum produto importado"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {importResult.imported > 0
                        ? "Os produtos já estão disponíveis no catálogo."
                        : "Nenhuma linha da planilha foi processada com sucesso."}
                    </p>
                  </div>
                  {importResult.imported > 0 && (
                    <Badge variant="success">{importResult.imported}</Badge>
                  )}
                </motion.div>

                {importResult.errors.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.4 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-error/10 ring-1 ring-error/20">
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
                      <Badge variant="error">
                        {importResult.errors.length}
                      </Badge>
                    </div>

                    <div className="max-h-64 overflow-y-auto rounded-[var(--radius-xl)] border border-error/10 bg-surface p-2 shadow-[var(--shadow-sm)]">
                      {importResult.errors.map((err, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            delay: 0.2 + idx * 0.04,
                            duration: 0.3,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                          className="group flex items-start gap-3 rounded-[var(--radius-lg)] px-4 py-3.5 transition-colors hover:bg-error-soft/40"
                        >
                          <span className="mt-0.5 shrink-0 rounded-[var(--radius-md)] bg-error/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-error ring-1 ring-error/20">
                            {err.row === 0 ? "Arquivo" : `Linha ${err.row}`}
                          </span>
                          <span className="text-sm leading-relaxed text-foreground/90">
                            {err.message}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                  className="flex justify-end pt-2"
                >
                  <Button
                    onClick={() => setImportResult(null)}
                    variant="secondary"
                  >
                    Fechar
                  </Button>
                </motion.div>
              </>
            ) : null}
          </motion.div>
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
                    <span className="font-medium text-foreground">
                      Preço de venda
                    </span>
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
                    <span className="font-medium text-foreground">
                      Custo unitário
                    </span>
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
                    <span className="font-medium text-foreground">
                      Embalagem
                    </span>
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
                <Button
                  disabled={manualProductMutation.isPending}
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
              </motion.div>
            </form>
          </motion.div>
        </Modal>

        {renderForms()}
      </div>
    </ProductsActionsProvider>
  );
}
