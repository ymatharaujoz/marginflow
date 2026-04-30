"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Button, Card } from "@marginflow/ui";
import type {
  AdCostFormValues,
  AdCostRecord,
  ManualExpenseFormValues,
  ManualExpenseRecord,
  ProductCatalogSnapshot,
  ProductCostFormValues,
  ProductCostRecord,
  ProductFormValues,
  ProductListItem,
} from "@marginflow/types";
import { ApiClientError, apiClient } from "@/lib/api/client";

const catalogQueryKey = ["product-catalog"] as const;

const initialProductForm: ProductFormValues = {
  isActive: true,
  name: "",
  sellingPrice: "0.00",
  sku: null,
};

const initialProductCostForm: ProductCostFormValues = {
  amount: "0.00",
  costType: "base",
  currency: "BRL",
  effectiveFrom: null,
  notes: null,
  productId: "",
};

const initialAdCostForm: AdCostFormValues = {
  amount: "0.00",
  channel: "manual",
  currency: "BRL",
  notes: null,
  productId: null,
  spentAt: null,
};

const initialManualExpenseForm: ManualExpenseFormValues = {
  amount: "0.00",
  category: "general",
  currency: "BRL",
  incurredAt: null,
  notes: null,
};

type ProductsHubProps = {
  organizationName: string;
};

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
    return "No date";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`));
}

function normalizeTextInput(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function fetchCatalog(): Promise<ProductCatalogSnapshot> {
  const [productsResponse, productCostsResponse, adCostsResponse, expensesResponse] =
    await Promise.all([
      apiClient.get<{ data: ProductListItem[]; error: null }>("/products"),
      apiClient.get<{ data: ProductCostRecord[]; error: null }>("/costs/products"),
      apiClient.get<{ data: AdCostRecord[]; error: null }>("/costs/ads"),
      apiClient.get<{ data: ManualExpenseRecord[]; error: null }>("/costs/expenses"),
    ]);

  return {
    adCosts: adCostsResponse.data,
    manualExpenses: expensesResponse.data,
    productCosts: productCostsResponse.data,
    products: productsResponse.data,
  };
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">{eyebrow}</p>
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="max-w-2xl text-sm leading-7 text-foreground-soft">{description}</p>
    </div>
  );
}

function SectionMessage({
  tone = "neutral",
  children,
}: {
  children: React.ReactNode;
  tone?: "critical" | "neutral";
}) {
  return (
    <p
      className={
        tone === "critical"
          ? "rounded-[var(--radius-md)] border border-[color:rgba(220,38,38,0.22)] bg-[color:rgba(220,38,38,0.08)] px-4 py-3 text-sm text-foreground"
          : "rounded-[var(--radius-md)] border border-border bg-background-soft px-4 py-3 text-sm text-foreground-soft"
      }
    >
      {children}
    </p>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: "date" | "number" | "text";
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm text-foreground-soft">
      <span>{label}</span>
      <input
        className="min-h-11 rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm text-foreground outline-none transition-colors focus:border-border-strong"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        step={type === "number" ? "0.01" : undefined}
        type={type}
        value={value}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm text-foreground-soft">
      <span>{label}</span>
      <textarea
        className="min-h-28 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-border-strong"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm text-foreground-soft">
      <span>{label}</span>
      <select
        className="min-h-11 rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm text-foreground outline-none transition-colors focus:border-border-strong"
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

export function ProductsHub({ organizationName }: ProductsHubProps) {
  const queryClient = useQueryClient();
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [productForm, setProductForm] = useState(initialProductForm);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productCostForm, setProductCostForm] = useState(initialProductCostForm);
  const [editingProductCostId, setEditingProductCostId] = useState<string | null>(null);
  const [adCostForm, setAdCostForm] = useState(initialAdCostForm);
  const [editingAdCostId, setEditingAdCostId] = useState<string | null>(null);
  const [manualExpenseForm, setManualExpenseForm] = useState(initialManualExpenseForm);
  const [editingManualExpenseId, setEditingManualExpenseId] = useState<string | null>(null);

  const catalogQuery = useQuery({
    queryFn: fetchCatalog,
    queryKey: catalogQueryKey,
  });

  const productOptions = useMemo(
    () =>
      (catalogQuery.data?.products ?? []).map((product) => ({
        label: `${product.name}${product.isActive ? "" : " (archived)"}`,
        value: product.id,
      })),
    [catalogQuery.data?.products],
  );

  const selectedProductId = productCostForm.productId || productOptions[0]?.value || "";

  async function refreshCatalog(message?: string) {
    await queryClient.invalidateQueries({ queryKey: catalogQueryKey });
    if (message) {
      setFeedbackMessage(message);
    }
  }

  const productMutation = useMutation({
    mutationFn: async () => {
      if (editingProductId) {
        return apiClient.patch<{ data: ProductListItem; error: null }>(`/products/${editingProductId}`, {
          body: productForm,
        });
      }

      return apiClient.post<{ data: ProductListItem; error: null }>("/products", {
        body: productForm,
      });
    },
    onError: (error) => {
      setFeedbackMessage(
        error instanceof ApiClientError ? error.message : "Product request failed.",
      );
    },
    onSuccess: async () => {
      setEditingProductId(null);
      setProductForm(initialProductForm);
      await refreshCatalog(editingProductId ? "Product updated." : "Product created.");
    },
  });

  const productCostMutation = useMutation({
    mutationFn: async () => {
      if (editingProductCostId) {
        return apiClient.patch<{ data: ProductCostRecord; error: null }>(
          `/costs/products/${editingProductCostId}`,
          {
            body: productCostForm,
          },
        );
      }

      return apiClient.post<{ data: ProductCostRecord; error: null }>("/costs/products", {
        body: productCostForm,
      });
    },
    onError: (error) => {
      setFeedbackMessage(
        error instanceof ApiClientError ? error.message : "Product cost request failed.",
      );
    },
    onSuccess: async () => {
      setEditingProductCostId(null);
      setProductCostForm({
        ...initialProductCostForm,
            productId: selectedProductId,
          });
      await refreshCatalog(editingProductCostId ? "Product cost updated." : "Product cost created.");
    },
  });

  const adCostMutation = useMutation({
    mutationFn: async () => {
      if (editingAdCostId) {
        return apiClient.patch<{ data: AdCostRecord; error: null }>(`/costs/ads/${editingAdCostId}`, {
          body: adCostForm,
        });
      }

      return apiClient.post<{ data: AdCostRecord; error: null }>("/costs/ads", {
        body: adCostForm,
      });
    },
    onError: (error) => {
      setFeedbackMessage(
        error instanceof ApiClientError ? error.message : "Ad cost request failed.",
      );
    },
    onSuccess: async () => {
      setEditingAdCostId(null);
      setAdCostForm(initialAdCostForm);
      await refreshCatalog(editingAdCostId ? "Ad cost updated." : "Ad cost created.");
    },
  });

  const manualExpenseMutation = useMutation({
    mutationFn: async () => {
      if (editingManualExpenseId) {
        return apiClient.patch<{ data: ManualExpenseRecord; error: null }>(
          `/costs/expenses/${editingManualExpenseId}`,
          {
            body: manualExpenseForm,
          },
        );
      }

      return apiClient.post<{ data: ManualExpenseRecord; error: null }>("/costs/expenses", {
        body: manualExpenseForm,
      });
    },
    onError: (error) => {
      setFeedbackMessage(
        error instanceof ApiClientError ? error.message : "Expense request failed.",
      );
    },
    onSuccess: async () => {
      setEditingManualExpenseId(null);
      setManualExpenseForm(initialManualExpenseForm);
      await refreshCatalog(
        editingManualExpenseId ? "Expense updated." : "Expense created.",
      );
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (product: ProductListItem) =>
      apiClient.patch<{ data: ProductListItem; error: null }>(`/products/${product.id}`, {
        body: {
          isActive: false,
        },
      }),
    onError: (error) => {
      setFeedbackMessage(
        error instanceof ApiClientError ? error.message : "Archive request failed.",
      );
    },
    onSuccess: async () => {
      await refreshCatalog("Product archived.");
    },
  });

  const isUnauthorized =
    catalogQuery.error instanceof ApiClientError && catalogQuery.error.status === 401;

  if (catalogQuery.isLoading) {
    return (
      <Card>
        <SectionHeader
          description="Loading products, costs, and expense entries from the API."
          eyebrow="M8 workspace"
          title="Preparing your management hub"
        />
      </Card>
    );
  }

  if (isUnauthorized) {
    return (
      <Card>
        <SectionHeader
          description="Your session is no longer valid for protected product data. Sign in again and retry."
          eyebrow="Access"
          title="Authentication required"
        />
      </Card>
    );
  }

  if (catalogQuery.error || !catalogQuery.data) {
    return (
      <Card>
        <SectionHeader
          description="The protected product workspace could not load from the API."
          eyebrow="Error state"
          title="We could not load your catalog"
        />
        <div className="mt-6">
          <SectionMessage tone="critical">
            {catalogQuery.error instanceof Error
              ? catalogQuery.error.message
              : "Unexpected error while loading the catalog."}
          </SectionMessage>
        </div>
      </Card>
    );
  }

  const { adCosts, manualExpenses, productCosts, products } = catalogQuery.data;
  const hasCatalogData =
    products.length > 0 || productCosts.length > 0 || adCosts.length > 0 || manualExpenses.length > 0;

  return (
    <div className="space-y-6">
      <Card>
        <SectionHeader
          description={`${organizationName} can now create products, track dated product costs, register manual ad spend, and record general expenses in one protected workspace.`}
          eyebrow="M8 workspace"
          title="Product and cost management hub"
        />
        <div className="mt-6 flex flex-wrap gap-3 text-sm text-foreground-soft">
          <span>{products.length} products</span>
          <span>{productCosts.length} product cost entries</span>
          <span>{adCosts.length} ad cost entries</span>
          <span>{manualExpenses.length} manual expenses</span>
        </div>
        {feedbackMessage ? <div className="mt-6"><SectionMessage>{feedbackMessage}</SectionMessage></div> : null}
        {!hasCatalogData ? (
          <div className="mt-6">
            <SectionMessage>
              No catalog data exists yet. Start by creating your first product, then attach product
              costs, ad costs, or general expenses.
            </SectionMessage>
          </div>
        ) : null}
      </Card>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <SectionHeader
            description="Products are organization-scoped and can be archived without deleting history."
            eyebrow="Products"
            title="Catalog"
          />
          <div className="mt-6 grid gap-4">
            {products.length === 0 ? (
              <SectionMessage>No products registered yet.</SectionMessage>
            ) : (
              products.map((product) => (
                <div
                  key={product.id}
                  className="rounded-[var(--radius-md)] border border-border bg-background-soft p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{product.name}</h3>
                      <p className="mt-1 text-sm text-foreground-soft">
                        SKU: {product.sku ?? "not set"} · Price: {formatMoney(product.sellingPrice)}
                      </p>
                      <p className="mt-1 text-sm text-foreground-soft">
                        Status: {product.isActive ? "active" : "archived"} · Latest cost:{" "}
                        {product.latestCost ? formatMoney(product.latestCost.amount) : "none"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setFeedbackMessage(null);
                          setEditingProductId(product.id);
                          setProductForm({
                            isActive: product.isActive,
                            name: product.name,
                            sellingPrice: product.sellingPrice,
                            sku: product.sku,
                          });
                        }}
                        variant="secondary"
                      >
                        Edit
                      </Button>
                      {product.isActive ? (
                        <Button
                          disabled={archiveMutation.isPending}
                          onClick={() => archiveMutation.mutate(product)}
                          variant="secondary"
                        >
                          Archive
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <SectionHeader
            description="Use the same form for first-time creation or later edits."
            eyebrow="Product form"
            title={editingProductId ? "Edit product" : "Create product"}
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
              label="Product name"
              onChange={(value) => setProductForm((current) => ({ ...current, name: value }))}
              required
              value={productForm.name}
            />
            <TextInput
              label="SKU"
              onChange={(value) => setProductForm((current) => ({ ...current, sku: normalizeTextInput(value) }))}
              value={productForm.sku ?? ""}
            />
            <TextInput
              label="Selling price"
              onChange={(value) => setProductForm((current) => ({ ...current, sellingPrice: value }))}
              required
              type="number"
              value={productForm.sellingPrice}
            />
            <label className="flex items-center gap-3 text-sm text-foreground-soft">
              <input
                checked={productForm.isActive}
                onChange={(event) =>
                  setProductForm((current) => ({ ...current, isActive: event.target.checked }))
                }
                type="checkbox"
              />
              Product is active
            </label>
            <div className="flex flex-wrap gap-3">
              <Button disabled={productMutation.isPending} type="submit">
                {productMutation.isPending
                  ? "Saving..."
                  : editingProductId
                    ? "Update product"
                    : "Create product"}
              </Button>
              {editingProductId ? (
                <Button
                  onClick={() => {
                    setEditingProductId(null);
                    setProductForm(initialProductForm);
                  }}
                  type="button"
                  variant="secondary"
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <SectionHeader
            description="Cost history stays appendable so later metric calculations can evaluate dated values."
            eyebrow="Product costs"
            title="History-enabled cost entries"
          />
          <div className="mt-6 grid gap-4">
            {productCosts.length === 0 ? (
              <SectionMessage>No product costs recorded yet.</SectionMessage>
            ) : (
              productCosts.map((cost) => {
                const product = products.find((entry) => entry.id === cost.productId);
                return (
                  <div key={cost.id} className="rounded-[var(--radius-md)] border border-border bg-background-soft p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-foreground">
                          {product?.name ?? "Unknown product"} · {cost.costType}
                        </h3>
                        <p className="mt-1 text-sm text-foreground-soft">
                          {formatMoney(cost.amount)} · Effective {formatDate(cost.effectiveFrom)}
                        </p>
                        <p className="mt-1 text-sm text-foreground-soft">{cost.notes ?? "No notes"}</p>
                      </div>
                      <Button
                        onClick={() => {
                          setFeedbackMessage(null);
                          setEditingProductCostId(cost.id);
                          setProductCostForm({
                            amount: cost.amount,
                            costType: cost.costType,
                            currency: cost.currency,
                            effectiveFrom: cost.effectiveFrom,
                            notes: cost.notes,
                            productId: cost.productId,
                          });
                        }}
                        variant="secondary"
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card>
          <SectionHeader
            description="Each entry is stored independently so the latest value can be resolved without deleting history."
            eyebrow="Cost form"
            title={editingProductCostId ? "Edit product cost" : "Create product cost"}
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
              label="Product"
              onChange={(value) => setProductCostForm((current) => ({ ...current, productId: value }))}
              options={productOptions.length > 0 ? productOptions : [{ label: "Create a product first", value: "" }]}
              value={selectedProductId}
            />
            <TextInput
              label="Cost type"
              onChange={(value) => setProductCostForm((current) => ({ ...current, costType: value }))}
              required
              value={productCostForm.costType}
            />
            <TextInput
              label="Amount"
              onChange={(value) => setProductCostForm((current) => ({ ...current, amount: value }))}
              required
              type="number"
              value={productCostForm.amount}
            />
            <TextInput
              label="Currency"
              onChange={(value) => setProductCostForm((current) => ({ ...current, currency: value }))}
              value={productCostForm.currency}
            />
            <TextInput
              label="Effective from"
              onChange={(value) => setProductCostForm((current) => ({ ...current, effectiveFrom: normalizeTextInput(value) }))}
              type="date"
              value={productCostForm.effectiveFrom ?? ""}
            />
            <TextArea
              label="Notes"
              onChange={(value) => setProductCostForm((current) => ({ ...current, notes: normalizeTextInput(value) }))}
              value={productCostForm.notes ?? ""}
            />
            <div className="flex flex-wrap gap-3">
              <Button
                disabled={productCostMutation.isPending || productOptions.length === 0}
                type="submit"
              >
                {productCostMutation.isPending
                  ? "Saving..."
                  : editingProductCostId
                    ? "Update cost"
                    : "Create cost"}
              </Button>
              {editingProductCostId ? (
                <Button
                  onClick={() => {
                    setEditingProductCostId(null);
                    setProductCostForm({
                      ...initialProductCostForm,
                      productId: productOptions[0]?.value ?? "",
                    });
                  }}
                  type="button"
                  variant="secondary"
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader
            description="Manual ad spend can optionally link back to a product while still capturing channel-level context."
            eyebrow="Ad costs"
            title="Advertising spend"
          />
          <div className="mt-6 grid gap-4">
            {adCosts.length === 0 ? (
              <SectionMessage>No ad cost entries recorded yet.</SectionMessage>
            ) : (
              adCosts.map((cost) => {
                const linkedProduct = products.find((entry) => entry.id === cost.productId);
                return (
                  <div key={cost.id} className="rounded-[var(--radius-md)] border border-border bg-background-soft p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-foreground">
                          {cost.channel} · {formatMoney(cost.amount)}
                        </h3>
                        <p className="mt-1 text-sm text-foreground-soft">
                          Product: {linkedProduct?.name ?? "Not linked"} · Spent {formatDate(cost.spentAt)}
                        </p>
                        <p className="mt-1 text-sm text-foreground-soft">{cost.notes ?? "No notes"}</p>
                      </div>
                      <Button
                        onClick={() => {
                          setFeedbackMessage(null);
                          setEditingAdCostId(cost.id);
                          setAdCostForm({
                            amount: cost.amount,
                            channel: cost.channel,
                            currency: cost.currency,
                            notes: cost.notes,
                            productId: cost.productId,
                            spentAt: cost.spentAt,
                          });
                        }}
                        variant="secondary"
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card>
          <SectionHeader
            description="Use this for channel spend even before marketplace integrations begin syncing real ads data."
            eyebrow="Ad cost form"
            title={editingAdCostId ? "Edit ad cost" : "Create ad cost"}
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
              label="Linked product"
              onChange={(value) => setAdCostForm((current) => ({ ...current, productId: value || null }))}
              options={[
                { label: "No linked product", value: "" },
                ...productOptions,
              ]}
              value={adCostForm.productId ?? ""}
            />
            <TextInput
              label="Channel"
              onChange={(value) => setAdCostForm((current) => ({ ...current, channel: value }))}
              required
              value={adCostForm.channel}
            />
            <TextInput
              label="Amount"
              onChange={(value) => setAdCostForm((current) => ({ ...current, amount: value }))}
              required
              type="number"
              value={adCostForm.amount}
            />
            <TextInput
              label="Currency"
              onChange={(value) => setAdCostForm((current) => ({ ...current, currency: value }))}
              value={adCostForm.currency}
            />
            <TextInput
              label="Spent at"
              onChange={(value) => setAdCostForm((current) => ({ ...current, spentAt: normalizeTextInput(value) }))}
              type="date"
              value={adCostForm.spentAt ?? ""}
            />
            <TextArea
              label="Notes"
              onChange={(value) => setAdCostForm((current) => ({ ...current, notes: normalizeTextInput(value) }))}
              value={adCostForm.notes ?? ""}
            />
            <div className="flex flex-wrap gap-3">
              <Button disabled={adCostMutation.isPending} type="submit">
                {adCostMutation.isPending
                  ? "Saving..."
                  : editingAdCostId
                    ? "Update ad cost"
                    : "Create ad cost"}
              </Button>
              {editingAdCostId ? (
                <Button
                  onClick={() => {
                    setEditingAdCostId(null);
                    setAdCostForm(initialAdCostForm);
                  }}
                  type="button"
                  variant="secondary"
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader
            description="General expenses stay separate from product costs so later financial formulas can classify them correctly."
            eyebrow="Manual expenses"
            title="General expense entries"
          />
          <div className="mt-6 grid gap-4">
            {manualExpenses.length === 0 ? (
              <SectionMessage>No manual expenses recorded yet.</SectionMessage>
            ) : (
              manualExpenses.map((expense) => (
                <div key={expense.id} className="rounded-[var(--radius-md)] border border-border bg-background-soft p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">
                        {expense.category} · {formatMoney(expense.amount)}
                      </h3>
                      <p className="mt-1 text-sm text-foreground-soft">
                        Incurred {formatDate(expense.incurredAt)}
                      </p>
                      <p className="mt-1 text-sm text-foreground-soft">{expense.notes ?? "No notes"}</p>
                    </div>
                    <Button
                      onClick={() => {
                        setFeedbackMessage(null);
                        setEditingManualExpenseId(expense.id);
                        setManualExpenseForm({
                          amount: expense.amount,
                          category: expense.category,
                          currency: expense.currency,
                          incurredAt: expense.incurredAt,
                          notes: expense.notes,
                        });
                      }}
                      variant="secondary"
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <SectionHeader
            description="Capture fixed or ad hoc operational costs until richer accounting flows arrive."
            eyebrow="Expense form"
            title={editingManualExpenseId ? "Edit expense" : "Create expense"}
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
              label="Category"
              onChange={(value) => setManualExpenseForm((current) => ({ ...current, category: value }))}
              required
              value={manualExpenseForm.category}
            />
            <TextInput
              label="Amount"
              onChange={(value) => setManualExpenseForm((current) => ({ ...current, amount: value }))}
              required
              type="number"
              value={manualExpenseForm.amount}
            />
            <TextInput
              label="Currency"
              onChange={(value) => setManualExpenseForm((current) => ({ ...current, currency: value }))}
              value={manualExpenseForm.currency}
            />
            <TextInput
              label="Incurred at"
              onChange={(value) => setManualExpenseForm((current) => ({ ...current, incurredAt: normalizeTextInput(value) }))}
              type="date"
              value={manualExpenseForm.incurredAt ?? ""}
            />
            <TextArea
              label="Notes"
              onChange={(value) =>
                setManualExpenseForm((current) => ({ ...current, notes: normalizeTextInput(value) }))
              }
              value={manualExpenseForm.notes ?? ""}
            />
            <div className="flex flex-wrap gap-3">
              <Button disabled={manualExpenseMutation.isPending} type="submit">
                {manualExpenseMutation.isPending
                  ? "Saving..."
                  : editingManualExpenseId
                    ? "Update expense"
                    : "Create expense"}
              </Button>
              {editingManualExpenseId ? (
                <Button
                  onClick={() => {
                    setEditingManualExpenseId(null);
                    setManualExpenseForm(initialManualExpenseForm);
                  }}
                  type="button"
                  variant="secondary"
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </Card>
      </section>
    </div>
  );
}
