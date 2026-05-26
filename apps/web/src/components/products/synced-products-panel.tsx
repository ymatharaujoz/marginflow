"use client";

import { Card, Button } from "@marginflow/ui";
import { useProductsActions } from "./products-actions-context";

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
      <p className="text-xs font-bold uppercase tracking-wider text-accent">
        {eyebrow}
      </p>
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

function translateSuggestedMatchReason(reason: string) {
  if (reason === "sku_exact") {
    return "SKU identico";
  }
  return reason;
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

function formatDateTime(value: string | null) {
  if (!value) {
    return "Sem historico";
  }
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function SyncedProductsPanel() {
  const {
    availableSyncedProducts,
    availableProducts,
    linkSelections,
    setLinkSelections,
    syncedProductMutation,
  } = useProductsActions();

  return (
    <Card>
      <SectionHeader
        description="Itens sincronizados com SKU interno unico sao vinculados automaticamente. Quando nao houver match ou quando o SKU estiver duplicado no catalogo, o item fica aqui para revisao manual."
        eyebrow="Mercado Livre"
        title="Produtos sincronizados"
      />
      <div className="mt-6 space-y-4">
        {availableSyncedProducts.length === 0 ? (
          <SectionMessage>
            Nenhum produto sincronizado disponivel neste momento.
          </SectionMessage>
        ) : (
          availableSyncedProducts.map((item) => {
            const linkedProduct = item.linkedProduct;
            const isLinked =
              item.reviewStatus === "linked_to_existing_product" &&
              !!linkedProduct;
            const isImported =
              item.reviewStatus === "imported_as_internal_product";
            const hasDuplicateSkuWarning =
              !linkedProduct && item.suggestedMatches.length > 1;
            const isActionable = !isLinked && !isImported;

            return (
              <Card
                key={item.externalProductId}
                variant="outlined"
                className="p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {item.title ?? "Produto sem titulo"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        SKU: {item.sku ?? "sem SKU"} · status:{" "}
                        {translateSyncedProductStatus(item.reviewStatus)}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.unitsSold} unidades · {item.orderCount} pedido(s) ·{" "}
                      {formatMoney(item.grossRevenue)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Comissao: {formatMoney(item.marketplaceCommission)} ·
                      Taxa fixa: {formatMoney(item.fixedFee)} · Frete:{" "}
                      {formatMoney(item.shippingCost)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total que ficou para o Mercado Livre:{" "}
                      {formatMoney(item.netMarketplaceTake)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ultimo pedido: {formatDateTime(item.lastOrderedAt)}
                    </p>
                    {isLinked ? (
                      <SectionMessage>
                        Vinculado automaticamente por SKU a{" "}
                        {linkedProduct!.name}
                        {linkedProduct!.sku
                          ? ` (${linkedProduct!.sku})`
                          : ""}
                        .
                      </SectionMessage>
                    ) : linkedProduct ? (
                      <SectionMessage>
                        Vinculado a {linkedProduct.name}
                        {linkedProduct.sku
                          ? ` (${linkedProduct.sku})`
                          : ""}
                        .
                      </SectionMessage>
                    ) : null}
                    {hasDuplicateSkuWarning ? (
                      <SectionMessage tone="critical">
                        Encontramos mais de um produto interno com este SKU.
                        Revise manualmente qual item deve receber o vinculo.
                      </SectionMessage>
                    ) : item.suggestedMatches.length > 0 ? (
                      <SectionMessage>
                        Sugestao principal:{" "}
                        {item.suggestedMatches[0]?.name}
                        {item.suggestedMatches[0]?.sku
                          ? ` (${item.suggestedMatches[0]?.sku})`
                          : ""}{" "}
                        por{" "}
                        {translateSuggestedMatchReason(
                          item.suggestedMatches[0]?.reason ?? "sku_exact"
                        )}
                        .
                      </SectionMessage>
                    ) : null}
                  </div>

                  <div className="w-full max-w-sm space-y-3">
                    {isActionable ? (
                      <>
                        <label className="grid gap-1.5 text-sm">
                          <span className="font-medium text-foreground">
                            Vincular a produto existente
                          </span>
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
                                {product.name}
                                {product.sku ? ` (${product.sku})` : ""}
                              </option>
                            ))}
                          </select>
                        </label>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            disabled={
                              syncedProductMutation.isPending ||
                              !linkSelections[item.externalProductId]
                            }
                            onClick={() =>
                              syncedProductMutation.mutate({
                                action: "link",
                                externalProductId: item.externalProductId,
                                productId:
                                  linkSelections[item.externalProductId],
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
                      </>
                    ) : (
                      <SectionMessage>
                        Este item ja entrou na aba de sincronizados sem exigir
                        revisao manual.
                      </SectionMessage>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </Card>
  );
}
