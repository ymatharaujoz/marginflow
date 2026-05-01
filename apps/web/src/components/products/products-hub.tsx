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
    return "Sem data";
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
    <div className="space-y-1.5">
      <p className="text-xs font-bold uppercase tracking-wider text-accent">{eyebrow}</p>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
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
  value,
  onChange,
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
        label: `${product.name}${product.isActive ? "" : " (arquivado)"}`,
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
        error instanceof ApiClientError ? error.message : "Não foi possível processar o produto.",
      );
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
      setFeedbackMessage(
        error instanceof ApiClientError ? error.message : "Não foi possível processar o custo do produto.",
      );
    },
    onSuccess: async () => {
      setEditingProductCostId(null);
      setProductCostForm({
        ...initialProductCostForm,
            productId: selectedProductId,
          });
      await refreshCatalog(editingProductCostId ? "Custo do produto atualizado." : "Custo do produto criado.");
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
        error instanceof ApiClientError ? error.message : "Não foi possível processar o custo em anúncios.",
      );
    },
    onSuccess: async () => {
      setEditingAdCostId(null);
      setAdCostForm(initialAdCostForm);
      await refreshCatalog(editingAdCostId ? "Custo em anúncios atualizado." : "Custo em anúncios criado.");
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
        error instanceof ApiClientError ? error.message : "Não foi possível processar a despesa.",
      );
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
      setFeedbackMessage(
        error instanceof ApiClientError ? error.message : "Não foi possível arquivar o produto.",
      );
    },
    onSuccess: async () => {
      await refreshCatalog("Produto arquivado.");
    },
  });

  const isUnauthorized =
    catalogQuery.error instanceof ApiClientError && catalogQuery.error.status === 401;

  if (catalogQuery.isLoading) {
    return (
      <Card>
        <SectionHeader
          description="Carregando produtos, custos e lançamentos de despesas da API."
          eyebrow="Catálogo"
          title="Preparando o hub de gestão"
        />
      </Card>
    );
  }

  if (isUnauthorized) {
    return (
      <Card>
        <SectionHeader
          description="Sua sessão não é mais válida para dados protegidos de produtos. Entre novamente e tente de novo."
          eyebrow="Acesso"
          title="É necessário autenticar"
        />
      </Card>
    );
  }

  if (catalogQuery.error || !catalogQuery.data) {
    return (
      <Card>
        <SectionHeader
          description="Não foi possível carregar o workspace de produtos a partir da API."
          eyebrow="Erro"
          title="Não conseguimos carregar seu catálogo"
        />
        <div className="mt-6">
          <SectionMessage tone="critical">
            {catalogQuery.error instanceof Error ? catalogQuery.error.message : "Erro inesperado ao carregar o catálogo."}
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
          description={`${organizationName}: crie produtos, registre custos por data, gastos em anúncios e despesas gerais ou operacionais protegidas no mesmo hub.`}
          eyebrow="Operação"
          title="Gestão de produtos e custos"
        />
        <div className="mt-6 flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span>{products.length} produtos</span>
          <span>{productCosts.length} lançamentos de custo por produto</span>
          <span>{adCosts.length} lançamentos em anúncios</span>
          <span>{manualExpenses.length} despesas manuais</span>
        </div>
        {feedbackMessage ? <div className="mt-6"><SectionMessage>{feedbackMessage}</SectionMessage></div> : null}
        {!hasCatalogData ? (
          <div className="mt-6">
            <SectionMessage>
              Ainda não há dados no catálogo. Comece criando o primeiro produto e associe custos de produto, anúncios ou despesas gerais.
            </SectionMessage>
          </div>
        ) : null}
      </Card>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <SectionHeader
            description="Produtos ficam ligados à organização e podem ser arquivados sem apagar histórico."
            eyebrow="Lista"
            title="Catálogo"
          />
          <div className="mt-6 grid gap-4">
            {products.length === 0 ? (
              <SectionMessage>Nenhum produto cadastrado ainda.</SectionMessage>
            ) : (
              products.map((product) => (
                <div key={product.id} className="rounded-[var(--radius-md)] border border-border bg-background-soft p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{product.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        SKU: {product.sku ?? "não informado"} · Preço: {formatMoney(product.sellingPrice)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Status: {product.isActive ? "ativo" : "arquivado"} · Último custo:{" "}
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
                        <Button disabled={archiveMutation.isPending} onClick={() => archiveMutation.mutate(product)} variant="secondary">
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
          <form className="mt-6 grid gap-4" onSubmit={(event) => {
            event.preventDefault();
            setFeedbackMessage(null);
            productMutation.mutate();
          }}>
            <TextInput
              label="Nome do produto"
              onChange={(value) => setProductForm((current) => ({ ...current, name: value }))}
              required
              value={productForm.name}
            />
            <TextInput label="SKU" onChange={(value) => setProductForm((current) => ({ ...current, sku: normalizeTextInput(value) }))} value={productForm.sku ?? ""} />
            <TextInput
              label="Preço de venda"
              onChange={(value) => setProductForm((current) => ({ ...current, sellingPrice: value }))}
              required
              type="number"
              value={productForm.sellingPrice}
            />
            <label className="flex items-center gap-3 text-sm text-muted-foreground">
              <input checked={productForm.isActive} onChange={(event) => setProductForm((current) => ({ ...current, isActive: event.target.checked }))} type="checkbox" />
              Produto ativo
            </label>
            <div className="flex flex-wrap gap-3">
              <Button disabled={productMutation.isPending} type="submit">
                {productMutation.isPending ? "Salvando..." : editingProductId ? "Atualizar produto" : "Criar produto"}
              </Button>
              {editingProductId ? (
                <Button onClick={() => { setEditingProductId(null); setProductForm(initialProductForm); }} type="button" variant="secondary">
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
            description="Novos valores entram ao longo do tempo para que relatórios usem dados datados sem apagar histórico."
            eyebrow="Custos de produto"
            title="Lançamentos de custo ao longo do tempo"
          />
          <div className="mt-6 grid gap-4">
            {productCosts.length === 0 ? (
              <SectionMessage>Nenhum custo de produto registrado.</SectionMessage>
            ) : (
              productCosts.map((cost) => {
                const product = products.find((entry) => entry.id === cost.productId);
                return (
                  <div key={cost.id} className="rounded-[var(--radius-md)] border border-border bg-background-soft p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-foreground">
                          {product?.name ?? "Produto desconhecido"} · {cost.costType}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatMoney(cost.amount)} · Vigência {formatDate(cost.effectiveFrom)}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">{cost.notes ?? "Sem observações"}</p>
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
            description="Cada lançamento fica gravado independentemente para manter reconciliações futuras."
            eyebrow="Formulário de custo"
            title={editingProductCostId ? "Editar custo do produto" : "Criar custo do produto"}
          />
          <form className="mt-6 grid gap-4" onSubmit={(event) => {
            event.preventDefault();
            setFeedbackMessage(null);
            productCostMutation.mutate();
          }}>
            <SelectInput
              label="Produto"
              onChange={(value) => setProductCostForm((current) => ({ ...current, productId: value }))}
              options={
                productOptions.length > 0 ? productOptions : [{ label: "Crie um produto primeiro", value: "" }]
              }
              value={selectedProductId}
            />
            <TextInput label="Tipo de custo" onChange={(value) => setProductCostForm((current) => ({ ...current, costType: value }))} required value={productCostForm.costType} />
            <TextInput label="Valor" onChange={(value) => setProductCostForm((current) => ({ ...current, amount: value }))} required type="number" value={productCostForm.amount} />
            <TextInput label="Moeda" onChange={(value) => setProductCostForm((current) => ({ ...current, currency: value }))} value={productCostForm.currency} />
            <TextInput label="Início da vigência" onChange={(value) => setProductCostForm((current) => ({ ...current, effectiveFrom: normalizeTextInput(value) }))} type="date" value={productCostForm.effectiveFrom ?? ""} />
            <TextArea label="Observações" onChange={(value) => setProductCostForm((current) => ({ ...current, notes: normalizeTextInput(value) }))} value={productCostForm.notes ?? ""} />
            <div className="flex flex-wrap gap-3">
              <Button disabled={productCostMutation.isPending || productOptions.length === 0} type="submit">
                {productCostMutation.isPending ? "Salvando..." : editingProductCostId ? "Atualizar custo" : "Criar custo"}
              </Button>
              {editingProductCostId ? (
                <Button
                  onClick={() => {
                    setEditingProductCostId(null);
                    setProductCostForm({ ...initialProductCostForm, productId: productOptions[0]?.value ?? "" });
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
            eyebrow="Gastos com anúncios"
            title="Spend em mídia paga"
          />
          <div className="mt-6 grid gap-4">
            {adCosts.length === 0 ? (
              <SectionMessage>Nenhum gasto em anúncios registrado.</SectionMessage>
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
                        <p className="mt-1 text-sm text-muted-foreground">
                          Produto: {linkedProduct?.name ?? "Sem vínculo"} · Gasto em {formatDate(cost.spentAt)}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">{cost.notes ?? "Sem observações"}</p>
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
            description="Use para registrar investimento em canal antes dos marketplaces entregarem dados detalhados de anúncios."
            eyebrow="Formulário de anúncio"
            title={editingAdCostId ? "Editar gasto em anúncio" : "Registrar gasto em anúncio"}
          />
          <form className="mt-6 grid gap-4" onSubmit={(event) => {
            event.preventDefault();
            setFeedbackMessage(null);
            adCostMutation.mutate();
          }}>
            <SelectInput
              label="Produto vinculado"
              onChange={(value) => setAdCostForm((current) => ({ ...current, productId: value || null }))}
              options={[{ label: "Sem produto vinculado", value: "" }, ...productOptions]}
              value={adCostForm.productId ?? ""}
            />
            <TextInput label="Canal" onChange={(value) => setAdCostForm((current) => ({ ...current, channel: value }))} required value={adCostForm.channel} />
            <TextInput label="Valor" onChange={(value) => setAdCostForm((current) => ({ ...current, amount: value }))} required type="number" value={adCostForm.amount} />
            <TextInput label="Moeda" onChange={(value) => setAdCostForm((current) => ({ ...current, currency: value }))} value={adCostForm.currency} />
            <TextInput label="Data do gasto" onChange={(value) => setAdCostForm((current) => ({ ...current, spentAt: normalizeTextInput(value) }))} type="date" value={adCostForm.spentAt ?? ""} />
            <TextArea label="Observações" onChange={(value) => setAdCostForm((current) => ({ ...current, notes: normalizeTextInput(value) }))} value={adCostForm.notes ?? ""} />
            <div className="flex flex-wrap gap-3">
              <Button disabled={adCostMutation.isPending} type="submit">
                {adCostMutation.isPending ? "Salvando..." : editingAdCostId ? "Atualizar gasto" : "Registrar gasto"}
              </Button>
              {editingAdCostId ? (
                <Button onClick={() => { setEditingAdCostId(null); setAdCostForm(initialAdCostForm); }} type="button" variant="secondary">
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
            description="Custos gerais ficam separados dos custos de produto para fórmulas financeiras não se misturarem."
            eyebrow="Despesas manuais"
            title="Lançamentos de despesa geral"
          />
          <div className="mt-6 grid gap-4">
            {manualExpenses.length === 0 ? (
              <SectionMessage>Nenhuma despesa manual registrada.</SectionMessage>
            ) : (
              manualExpenses.map((expense) => (
                <div key={expense.id} className="rounded-[var(--radius-md)] border border-border bg-background-soft p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">
                        {expense.category} · {formatMoney(expense.amount)}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Competência em {formatDate(expense.incurredAt)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{expense.notes ?? "Sem observações"}</p>
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
            description="Registre fixos ou eventuais até que fluxos mais avançados de contabilidade entrem no produto."
            eyebrow="Formulário de despesa"
            title={editingManualExpenseId ? "Editar despesa" : "Nova despesa"}
          />
          <form className="mt-6 grid gap-4" onSubmit={(event) => {
            event.preventDefault();
            setFeedbackMessage(null);
            manualExpenseMutation.mutate();
          }}>
            <TextInput label="Categoria" onChange={(value) => setManualExpenseForm((current) => ({ ...current, category: value }))} required value={manualExpenseForm.category} />
            <TextInput label="Valor" onChange={(value) => setManualExpenseForm((current) => ({ ...current, amount: value }))} required type="number" value={manualExpenseForm.amount} />
            <TextInput label="Moeda" onChange={(value) => setManualExpenseForm((current) => ({ ...current, currency: value }))} value={manualExpenseForm.currency} />
            <TextInput label="Data da competência" onChange={(value) => setManualExpenseForm((current) => ({ ...current, incurredAt: normalizeTextInput(value) }))} type="date" value={manualExpenseForm.incurredAt ?? ""} />
            <TextArea label="Observações" onChange={(value) => setManualExpenseForm((current) => ({ ...current, notes: normalizeTextInput(value) }))} value={manualExpenseForm.notes ?? ""} />
            <div className="flex flex-wrap gap-3">
              <Button disabled={manualExpenseMutation.isPending} type="submit">
                {manualExpenseMutation.isPending ? "Salvando..." : editingManualExpenseId ? "Atualizar despesa" : "Criar despesa"}
              </Button>
              {editingManualExpenseId ? (
                <Button onClick={() => { setEditingManualExpenseId(null); setManualExpenseForm(initialManualExpenseForm); }} type="button" variant="secondary">
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
