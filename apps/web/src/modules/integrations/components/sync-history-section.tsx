"use client";

import { motion } from "framer-motion";
import { History, Trash2, AlertCircle } from "lucide-react";
import { Button, Skeleton } from "@marginflow/ui";
import { fadeInVariants } from "@/lib/animations";
import { StatusBadge } from "@/components/ui-premium/status-badge";
import { translateSyncRunStatus } from "@/lib/pt-br/api-ui";
import { formatStartedParts, formatSyncDuration } from "../lib/formatters";
import type { SyncRunRecord } from "../types/integrations";

interface SyncHistorySectionProps {
  syncHistory: SyncRunRecord[];
  isLoading: boolean;
  isClearing: boolean;
  onClearHistory: () => void;
}

function mapRunStatusToBadge(
  status: string,
): "success" | "error" | "pending" | "inactive" | "warning" {
  if (status === "completed") return "success";
  if (status === "failed") return "error";
  if (status === "running" || status === "pending") return "pending";
  return "inactive";
}

function ImportSummary({ run }: { run: SyncRunRecord }) {
  const { orders, products, items, fees } = run.counts;
  const bits = [
    { k: "Pedidos", v: orders },
    { k: "Produtos", v: products },
    { k: "Itens", v: items },
    { k: "Taxas", v: fees },
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {bits.map(({ k, v }) => (
        <span
          key={k}
          className="inline-flex items-baseline gap-1 rounded-md border border-border/70 bg-background px-2 py-0.5 shadow-[var(--shadow-xs)]"
        >
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{k}</span>
          <span className="tabular-nums text-xs font-semibold text-foreground">{v}</span>
        </span>
      ))}
    </div>
  );
}

export function SyncHistorySection({
  syncHistory,
  isLoading,
  isClearing,
  onClearHistory,
}: SyncHistorySectionProps) {
  if (isLoading) {
    return (
      <motion.section variants={fadeInVariants} className="space-y-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Histórico de Sincronizações
          </h3>
        </div>
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-background shadow-[var(--shadow-xs)]">
          <div className="border-b border-border bg-surface-strong/90 px-5 py-3">
            <div className="flex gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-3 w-16" />
              ))}
            </div>
          </div>
          <div className="divide-y divide-border/50">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-8 px-5 py-4">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-10 w-28" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-8 flex-1" />
              </div>
            ))}
          </div>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section variants={fadeInVariants} className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Histórico de Sincronizações
          </h3>
          {syncHistory.length > 0 && (
            <span className="rounded-full bg-muted/40 px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
              {syncHistory.length}
            </span>
          )}
        </div>
        {syncHistory.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearHistory}
            disabled={isClearing}
            loading={isClearing}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:bg-error-soft/40 hover:text-error"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Limpar histórico
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-background shadow-[var(--shadow-xs)]">
        {syncHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted/30">
              <History className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Nenhuma sincronização ainda</p>
            <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
              Quando você rodar uma sincronização, cada execução aparecerá aqui com status, horário e volumes importados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-strong/95">
                  <th className="whitespace-nowrap px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Status
                  </th>
                  <th className="whitespace-nowrap px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Marketplace
                  </th>
                  <th className="whitespace-nowrap px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Início
                  </th>
                  <th className="whitespace-nowrap px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Janela
                  </th>
                  <th className="whitespace-nowrap px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Duração
                  </th>
                  <th className="min-w-[220px] px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Importação
                  </th>
                </tr>
              </thead>
              <tbody>
                {syncHistory.map((run, rowIndex) => {
                  const started = formatStartedParts(run.startedAt);
                  const duration = formatSyncDuration(run.startedAt, run.finishedAt);

                  return (
                    <tr
                      key={run.id}
                      className={`border-b border-border/50 transition-colors last:border-b-0 hover:bg-surface-strong/40 ${
                        rowIndex % 2 === 1 ? "bg-surface-strong/[0.35]" : ""
                      }`}
                    >
                      <td className="align-top px-5 py-4">
                        <StatusBadge
                          status={mapRunStatusToBadge(run.status)}
                          label={translateSyncRunStatus(run.status)}
                          className="text-[11px]"
                        />
                      </td>
                      <td className="align-top px-5 py-4">
                        <span className="inline-flex rounded-md border border-border/70 bg-muted/20 px-2 py-1 font-mono text-[11px] font-medium text-foreground">
                          {run.provider === "mercadolivre" ? "MELI" : run.provider === "shopee" ? "SHPE" : run.provider.toUpperCase().slice(0, 4)}
                        </span>
                      </td>
                      <td className="align-top px-5 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium leading-tight text-foreground">{started.dateLine}</span>
                          {started.timeLine ? (
                            <span className="text-xs tabular-nums text-muted-foreground">{started.timeLine}</span>
                          ) : null}
                          {run.finishedAt ? (
                            <span className="mt-1 text-[11px] text-muted-foreground">
                              Fim:{" "}
                              <span className="tabular-nums text-foreground/80">
                                {formatStartedParts(run.finishedAt).timeLine || "—"}
                              </span>
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="align-top px-5 py-4">
                        <span className="inline-flex max-w-[14rem] truncate rounded-md border border-border/80 bg-muted/15 px-2 py-1 font-mono text-[11px] leading-none text-foreground">
                          {run.windowKey || "—"}
                        </span>
                      </td>
                      <td className="align-top px-5 py-4 text-right">
                        <span className="tabular-nums text-sm font-medium text-foreground">{duration}</span>
                      </td>
                      <td className="align-top px-5 py-4">
                        <div className="flex flex-col gap-2">
                          <ImportSummary run={run} />
                          {run.errorSummary ? (
                            <div className="flex gap-1.5 rounded-md border border-error/20 bg-error-soft/50 px-2 py-1.5">
                              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-error" />
                              <p className="text-[11px] leading-snug text-error">{run.errorSummary}</p>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.section>
  );
}
