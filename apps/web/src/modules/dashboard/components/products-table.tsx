"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Package, ArrowUpRight } from "lucide-react";
import { Card, EmptyState, Badge } from "@lucreii/ui";
import { StatusBadge } from "@/components/ui-premium/status-badge";
import { slideInUpVariants } from "@/lib/animations";
import type { DashboardProfitabilityResponse } from "@lucreii/types";
import { buildDashboardProductRows } from "../calculations/product-rows";
import { formatMoney, formatPercent, formatNumber } from "../utils/formatters";

interface ProductsTableProps {
  data: DashboardProfitabilityResponse;
  className?: string;
}

const healthBadgeConfig = {
  critical: { status: "error" as const, label: "Crítico" },
  attention: { status: "warning" as const, label: "Atenção" },
  neutral: { status: "inactive" as const, label: "Neutro" },
  healthy: { status: "success" as const, label: "Saudável" },
  scalable: { status: "active" as const, label: "Escalável" },
};

function getChannelBadge(channel: string) {
  const normalized = channel.trim().toLowerCase();

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
        SHPE
      </Badge>
    );
  }

  return <Badge>{channel}</Badge>;
}

export function ProductsTable({ data, className = "" }: ProductsTableProps) {
  const allRows = buildDashboardProductRows(data);
  // Pegar apenas os 5 melhores produtos (ordenados por lucro)
  const rows = allRows
    .filter((row) => row.netSales > 0) // Excluir produtos sem vendas
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5);

  if (rows.length === 0) {
    return (
      <Card padding="lg" className={className}>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">Produtos</h3>
          <p className="text-xs text-muted-foreground">Performance por SKU</p>
        </div>
        <EmptyState
          title="Nenhum produto com dados suficientes"
          description="Cadastre produtos e custos para visualizar a lucratividade por item."
          icon={<Package className="h-6 w-6" />}
          action={
            <Link
              href="/app/products"
              className="inline-flex items-center gap-1 text-sm font-medium text-accent transition-colors hover:text-accent-strong"
            >
              Cadastrar produtos
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <motion.div variants={slideInUpVariants}>
      <Card padding="lg" className={className}>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">TOP 5 Produtos</h3>
            <p className="text-xs text-muted-foreground">Maiores lucros por SKU</p>
          </div>
          <Link
            href="/app/products"
            className="flex items-center gap-1 text-xs font-medium text-accent transition-colors hover:text-accent-strong"
          >
            Ver todos
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Scroll horizontal para a tabela expandida */}
        <div className="overflow-x-auto -mx-2 px-2">
          <div className="min-w-[960px]">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-strong/95">
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Canal
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Produto
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Saúde
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Vendas
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Devoluções
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Receita
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Lucro
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row, index) => {
                  const returnRate = row.sales > 0 ? row.returns / row.sales : 0;
                  const healthBadge = healthBadgeConfig[row.health];

                  return (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03, duration: 0.3 }}
                      className="transition-colors duration-150 hover:bg-foreground/[0.015]"
                    >
                      <td className="px-3 py-3 text-center">{getChannelBadge(row.channelLabel)}</td>

                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                            <Package className="h-4 w-4 text-accent" />
                          </div>
                          <div className="min-w-0 max-w-[300px]">
                            <p className="truncate text-sm font-medium text-foreground">{row.name}</p>
                            <p className="truncate font-mono text-xs text-muted-foreground">{row.sku || "—"}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3 text-center">
                        <StatusBadge status={healthBadge.status} label={healthBadge.label} />
                      </td>

                      <td className="px-3 py-3 text-right">
                        <span className="text-sm text-foreground">{formatNumber(row.sales)}</span>
                      </td>

                      <td className="px-3 py-3 text-right">
                        <div className="flex flex-col items-end">
                          <span className={`text-sm ${returnRate > 0.15 ? "text-error" : "text-foreground"}`}>
                            {formatNumber(row.returns)}
                          </span>
                          {returnRate > 0.05 && (
                            <span className="text-[10px] text-muted-foreground">
                              ({formatPercent(returnRate * 100, { digits: 0 })})
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-3 text-right">
                        <span className="text-sm font-medium text-foreground">{formatMoney(row.revenue)}</span>
                      </td>

                      <td className="px-3 py-3 text-right">
                        <span className={`text-sm font-semibold ${row.profit >= 0 ? "text-success" : "text-error"}`}>
                          {formatMoney(row.profit)}
                        </span>
                      </td>

                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </Card>
    </motion.div>
  );
}
