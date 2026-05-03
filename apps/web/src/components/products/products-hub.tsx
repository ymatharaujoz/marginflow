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
  SyncedProductActionResult,
  SyncedProductRecord,
  SyncedProductReviewStatus,
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

type FeedbackTone = "critical" | "neutral";

type SyncedProductMutationInput = {
  action: "ignore" | "import" | "link";
  externalProductId: string;
  productId?: string;
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
    return "Sem data";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Sem historico";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function normalizeTextInput(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function translateSyncedProductStatus(status: SyncedProductReviewStatus) {
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

function translateSuggestedMatchReason(reason: string) {
  if (reason === "sku_exact") {
    return "SKU identico";
  }

  return reason;
}

async function fetchCatalog(): Promise<ProductCatalogSnapshot> {
  const [
    productsResponse,
    productCostsResponse,
    adCostsResponse,
    expensesResponse,
    syncedProductsResponse,
  ] = await Promise.all([
    apiClient.get<{ data: ProductListItem[]; error: null }>("/products"),
    apiClient.get<{ data: ProductCostRecord[]; error: null }>("/costs/products"),
    apiClient.get<{ data: AdCostRecord[]; error: null }>("/costs/ads"),
    apiClient.get<{ data: ManualExpenseRecord[]; error: null }>("/costs/expenses"),
    apiClient.get<{ data: SyncedProductRecord[]; error: null }>(
      "/integrations/mercadolivre/products",
    ),
  ]);

  return {
    adCosts: adCostsResponse.data,
    manualExpenses: expensesResponse.data,
    productCosts: productCostsResponse.data,
    products: productsResponse.data,
    syncedProducts: syncedProductsResponse.data,
  };
}

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
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: "date" | "number" | "text";
  value: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <input
        className="h-10 rounded-[var(--radius-md)] border border-border bg-surface-strong px-3.5 text-sm text-foreground placeholder:text-muted transition-all duration-[var(--transition-fast)] hover:border-border-strong focus:border-border-focus focus:outline-2 focus:outline-accent/20"
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

export function ProductsHub({ organizationName }: ProductsHubProps) {
  const queryClient = useQueryClient();
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>("neutral");
  const [productForm, setProductForm] = useState(initialProductForm);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productCostForm, setProductCostForm] = useState(initialProductCostForm);
  const [editingProductCostId, setEditingProductCostId] = useState<string | null>(null);
  const [adCostForm, setAdCostForm] = useState(initialAdCostForm);
  const [editingAdCostId, setEditingAdCostId] = useState<string | null>(null);
  const [manualExpenseForm, setManualExpenseForm] = useState(initialManualExpenseForm);
  const [editingManualExpenseId, setEditingManualExpenseId] = useState<string | null>(null);
  const [linkSelections, setLinkSelections] = useState<Record<string, string>>({});

  const catalogQuery = useQuery({
    queryFn: fetchCatalog,
    queryKey: catalogQueryKey,
  });

  const productOptions = useMemo(
    () =>
      (catalogQuery.data?.products ?? []).map((product) => ({
        label: `${product.name}${product.isActive ? "" : " (arquivado)"}`,
        value: product.id,
      })),
    [catalogQuery.data?.products],
  );

  const selectedProductId = productCostForm.productId || productOptions[0]?.value || "";

  async function refreshCatalog(message?: string, tone: FeedbackTone = "neutral") {
    await queryClient.invalidateQueries({ queryKey: catalogQueryKey });

    if (message) {
      setFeedbackMessage(message);
      setFeedbackTone(tone);
    }
  }

  function setCriticalFeedback(error: unknown, fallback: string) {
    setFeedbackMessage(error instanceof ApiClientError ? error.message : fallback);
    setFeedbackTone("critical");
  }

  const productMutation = useMutation({
    mutationFn: async () => {
      if (editingProductId) {
        return apiClient.patch<{ data: ProductListItem; error: null }>(
          `/products/${editingProductId}`,
          {
            body: productForm,
          },
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
          },
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
      setProductCostForm({
        ...initialProductCostForm,
        productId: selectedProductId,
      });
      await refreshCatalog(
        editingProductCostId ? "Custo do produto atualizado." : "Custo do produto criado.",
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
          },
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
      await refreshCatalog(
        editingAdCostId ? "Custo em anuncios atualizado." : "Custo em anuncios criado.",
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
          },
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
      await refreshCatalog(
        editingManualExpenseId ? "Despesa atualizada." : "Despesa criada.",
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
      setCriticalFeedback(error, "Nao foi possivel arquivar o produto.");
    },
    onSuccess: async () => {
      await refreshCatalog("Produto arquivado.");
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
        {
          body: {
            productId: input.productId,
          },
        },
      );
    },
    onError: (error) => {
      setCriticalFeedback(error, "Nao foi possivel revisar o produto sincronizado.");
    },
    onSuccess: async (response) => {
      await refreshCatalog(response.data.message);
    },
  });

  const isUnauthorized =
    catalogQuery.error instanceof ApiClientError && catalogQuery.error.status === 401;

  if (catalogQuery.isLoading) {
    return (
      <Card>
        <SectionHeader
          description="Carregando produtos, custos, despesas e revisoes sincronizadas da API."
          eyebrow="Catalogo"
          title="Preparando o hub de gestao"
        />
      </Card>
    );
  }

  if (isUnauthorized) {
    return (
      <Card>
        <SectionHeader
          description="Sua sessao nao e mais valida para dados protegidos de produtos. Entre novamente e tente de novo."
          eyebrow="Acesso"
          title="E necessario autenticar"
        />
      </Card>
    );
  }

  if (catalogQuery.error || !catalogQuery.data) {
    return (
      <Card>
        <SectionHeader
          description="Nao foi possivel carregar o workspace de produtos a partir da API."
          eyebrow="Erro"
          title="Nao conseguimos carregar seu catalogo"
        />
        <div className="mt-6">
          <SectionMessage tone="critical">
            {catalogQuery.error instanceof Error
              ? catalogQuery.error.message
              : "Erro inesperado ao carregar o catalogo."}
          </SectionMessage>
        </div>
      </Card>
    );
  }

  const { adCosts, manualExpenses, productCosts, products, syncedProducts } = catalogQuery.data;
  const pendingSyncedProducts = syncedProducts.filter(
    (product) => product.reviewStatus === "unreviewed",
  ).length;
  const hasCatalogData =
    products.length > 0 ||
    productCosts.length > 0 ||
    adCosts.length > 0 ||
    manualExpenses.length > 0 ||
    syncedProducts.length > 0;

  return (
    <div className="space-y-6">
      <Card>
        <SectionHeader
          description={`${organizationName}: crie produtos, registre custos por data, gastos em anuncios e despesas gerais, e revise o que chegou do Mercado Livre no mesmo hub.`}
          eyebrow="Operacao"
          title="Gestao de produtos e custos"
        />
        <div className="mt-6 flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span>{products.length} produtos internos</span>
          <span>{syncedProducts.length} produtos sincronizados</span>
          <span>{pendingSyncedProducts} pendentes de revisao</span>
          <span>{productCosts.length} lancamentos de custo</span>
          <span>{adCosts.length} lancamentos em anuncios</span>
          <span>{manualExpenses.length} despesas manuais</span>
        </div>
        {feedbackMessage ? (
          <div className="mt-6">
            <SectionMessage tone={feedbackTone}>{feedbackMessage}</SectionMessage>
          </div>
        ) : null}
        {!hasCatalogData ? (
          <div className="mt-6">
            <SectionMessage>
              Ainda nao ha dados no catalogo. Comece criando o primeiro produto ou conecte o
              Mercado Livre para revisar os itens sincronizados.
            </SectionMessage>
          </div>
        ) : null}
      </Card>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <SectionHeader
            description="Itens sincronizados do Mercado Livre chegam primeiro como candidatos de revisao. Voce decide se vira um novo produto interno, um vinculo com um produto existente ou fica ignorado por enquanto."
            eyebrow="Mercado Livre"
            title="Produtos sincronizados para revisao"
          />
          <div className="mt-6 grid gap-4">
            {syncedProducts.length === 0 ? (
              <SectionMessage>
                Nenhum produto sincronizado ainda. Va em Integracoes, conecte sua conta e rode a
                primeira sincronizacao manual.
              </SectionMessage>
            ) : (
              syncedProducts.map((syncedProduct) => {
                const selectedLinkedProductId =
                  linkSelections[syncedProduct.externalProductId] ??
                  syncedProduct.linkedProduct?.id ??
                  syncedProduct.suggestedMatches[0]?.productId ??
                  "";

                return (
                  <div
                    key={syncedProduct.externalProductId}
                    className="rounded-[var(--radius-md)] border border-border bg-background-soft p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {syncedProduct.title ??
                            `Produto sincronizado ${syncedProduct.externalProductId}`}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          SKU: {syncedProduct.sku ?? "nao informado"} · Status:{" "}
                          {translateSyncedProductStatus(syncedProduct.reviewStatus)}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {syncedProduct.orderCount} pedidos · {syncedProduct.unitsSold} unidades ·{" "}
                          {formatMoney(syncedProduct.grossRevenue)} em vendas
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Ultima venda: {formatDateTime(syncedProduct.lastOrderedAt)} · Ultimo preco
                          unitario:{" "}
                          {syncedProduct.latestUnitPrice
                            ? formatMoney(syncedProduct.latestUnitPrice)
                            : "sem historico"}
                        </p>
                        {syncedProduct.linkedProduct ? (
                          <p className="mt-1 text-sm text-muted-foreground">
                            Vinculado a: {syncedProduct.linkedProduct.name} (
                            {syncedProduct.linkedProduct.sku ?? "sem SKU"})
                          </p>
                        ) : null}
                        {syncedProduct.suggestedMatches.length > 0 ? (
                          <p className="mt-1 text-sm text-muted-foreground">
                            Sugestoes:{" "}
                            {syncedProduct.suggestedMatches
                              .map(
                                (match) =>
                                  `${match.name} (${translateSuggestedMatchReason(match.reason)})`,
                              )
                              .join(", ")}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex w-full max-w-sm flex-col gap-3">
                        <SelectInput
                          label="Vincular ao produto"
                          onChange={(value) =>
                            setLinkSelections((current) => ({
                              ...current,
                              [syncedProduct.externalProductId]: value,
                            }))
                          }
                          options={[
                            { label: "Selecione um produto do catalogo", value: "" },
                            ...productOptions,
                          ]}
                          value={selectedLinkedProductId}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            disabled={
                              syncedProductMutation.isPending ||
                              syncedProduct.reviewStatus === "imported_as_internal_product"
                            }
                            onClick={() => {
                              setFeedbackMessage(null);
                              syncedProductMutation.mutate({
                                action: "import",
                                externalProductId: syncedProduct.externalProductId,
                              });
                            }}
                            variant="secondary"
                          >
                            Importar para catalogo
                          </Button>
                          <Button
                            disabled={
                              syncedProductMutation.isPending ||
                              selectedLinkedProductId.length === 0 ||
                              syncedProduct.reviewStatus === "imported_as_internal_product"
                            }
                            onClick={() => {
                              setFeedbackMessage(null);
                              syncedProductMutation.mutate({
                                action: "link",
                                externalProductId: syncedProduct.externalProductId,
                                productId: selectedLinkedProductId,
                              });
                            }}
                            variant="secondary"
                          >
                            Vincular existente
                          </Button>
                          <Button
                            disabled={
                              syncedProductMutation.isPending ||
                              syncedProduct.reviewStatus === "ignored"
                            }
                            onClick={() => {
                              setFeedbackMessage(null);
                              syncedProductMutation.mutate({
                                action: "ignore",
                                externalProductId: syncedProduct.externalProductId,
                              });
                            }}
                            variant="ghost"
                          >
                            Ignorar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card>
          <SectionHeader
            description="O catalogo interno continua sendo a fonte editavel para nome, SKU, preco e custos. O sync do Mercado Livre abastece a fila de revisao e os dados de venda."
            eyebrow="Fluxo"
            title="Como isso conversa com o dashboard"
          />
          <div className="mt-6 grid gap-3">
            <SectionMessage>
              1. Rode a sincronizacao manual em <strong>Integracoes</strong> para importar pedidos,
              itens, taxas e referencias de produto.
            </SectionMessage>
            <SectionMessage>
              2. Revise os produtos sincronizados aqui e escolha entre importar um novo produto
              interno, vincular a um produto existente ou ignorar por enquanto.
            </SectionMessage>
            <SectionMessage>
              3. O dashboard e as metricas financeiras usam o vinculo explicito do produto antes do
              fallback por SKU.
            </SectionMessage>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <SectionHeader
            description="Produtos internos ficam ligados a organizacao e podem ser arquivados sem apagar historico."
            eyebrow="Lista"
            title="Catalogo interno"
          />
          <div className="mt-6 grid gap-4">
            {products.length === 0 ? (
              <SectionMessage>Nenhum produto interno cadastrado ainda.</SectionMessage>
            ) : (
              products.map((product) => (
                <div
                  key={product.id}
                  className="rounded-[var(--radius-md)] border border-border bg-background-soft p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{product.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        SKU: {product.sku ?? "nao informado"} · Preco:{" "}
                        {formatMoney(product.sellingPrice)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Status: {product.isActive ? "ativo" : "arquivado"} · Ultimo custo:{" "}
                        {product.latestCost ? formatMoney(product.latestCost.amount) : "sem registro"}
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
                        Editar
                      </Button>
                      {product.isActive ? (
                        <Button
                          disabled={archiveMutation.isPending}
                          onClick={() => archiveMutation.mutate(product)}
                          variant="secondary"
                        >
                          Arquivar
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
              label="Preco de venda"
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
              {editingProductId ? (
                <Button
                  onClick={() => {
                    setEditingProductId(null);
                    setProductForm(initialProductForm);
                  }}
                  type="button"
                  variant="secondary"
                >
                  Cancelar
                </Button>
              ) : null}
            </div>
          </form>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <SectionHeader
            description="Novos valores entram ao longo do tempo para que relatorios usem dados datados sem apagar historico."
            eyebrow="Custos de produto"
            title="Lancamentos de custo ao longo do tempo"
          />
          <div className="mt-6 grid gap-4">
            {productCosts.length === 0 ? (
              <SectionMessage>Nenhum custo de produto registrado.</SectionMessage>
            ) : (
              productCosts.map((cost) => {
                const product = products.find((entry) => entry.id === cost.productId);

                return (
                  <div
                    key={cost.id}
                    className="rounded-[var(--radius-md)] border border-border bg-background-soft p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-foreground">
                          {product?.name ?? "Produto desconhecido"} · {cost.costType}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatMoney(cost.amount)} · Vigencia {formatDate(cost.effectiveFrom)}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {cost.notes ?? "Sem observacoes"}
                        </p>
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
                        Editar
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
            description="Cada lancamento fica gravado separadamente para manter conciliacoes futuras."
            eyebrow="Formulario de custo"
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
              label="Inicio da vigencia"
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
              label="Observacoes"
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
                  Cancelar
                </Button>
              ) : null}
            </div>
          </form>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader
            description="Gasto manual em ads pode ficar opcionalmente ligado a um produto, mantendo o contexto por canal."
            eyebrow="Gastos com anuncios"
            title="Spend em midia paga"
          />
          <div className="mt-6 grid gap-4">
            {adCosts.length === 0 ? (
              <SectionMessage>Nenhum gasto em anuncios registrado.</SectionMessage>
            ) : (
              adCosts.map((cost) => {
                const linkedProduct = products.find((entry) => entry.id === cost.productId);

                return (
                  <div
                    key={cost.id}
                    className="rounded-[var(--radius-md)] border border-border bg-background-soft p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-foreground">
                          {cost.channel} · {formatMoney(cost.amount)}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Produto: {linkedProduct?.name ?? "Sem vinculo"} · Gasto em{" "}
                          {formatDate(cost.spentAt)}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {cost.notes ?? "Sem observacoes"}
                        </p>
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
                        Editar
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
            description="Use para registrar investimento em canal antes dos marketplaces entregarem dados detalhados de anuncios."
            eyebrow="Formulario de anuncio"
            title={editingAdCostId ? "Editar gasto em anuncio" : "Registrar gasto em anuncio"}
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
              label="Observacoes"
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
              {editingAdCostId ? (
                <Button
                  onClick={() => {
                    setEditingAdCostId(null);
                    setAdCostForm(initialAdCostForm);
                  }}
                  type="button"
                  variant="secondary"
                >
                  Cancelar
                </Button>
              ) : null}
            </div>
          </form>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader
            description="Custos gerais ficam separados dos custos de produto para as formulas financeiras nao se misturarem."
            eyebrow="Despesas manuais"
            title="Lancamentos de despesa geral"
          />
          <div className="mt-6 grid gap-4">
            {manualExpenses.length === 0 ? (
              <SectionMessage>Nenhuma despesa manual registrada.</SectionMessage>
            ) : (
              manualExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="rounded-[var(--radius-md)] border border-border bg-background-soft p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">
                        {expense.category} · {formatMoney(expense.amount)}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Competencia em {formatDate(expense.incurredAt)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {expense.notes ?? "Sem observacoes"}
                      </p>
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
                      Editar
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <SectionHeader
            description="Registre custos fixos ou eventuais ate que fluxos mais avancados de contabilidade entrem no produto."
            eyebrow="Formulario de despesa"
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
              label="Data da competencia"
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
              label="Observacoes"
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
              {editingManualExpenseId ? (
                <Button
                  onClick={() => {
                    setEditingManualExpenseId(null);
                    setManualExpenseForm(initialManualExpenseForm);
                  }}
                  type="button"
                  variant="secondary"
                >
                  Cancelar
                </Button>
              ) : null}
            </div>
          </form>
        </Card>
      </section>
    </div>
  );
}
