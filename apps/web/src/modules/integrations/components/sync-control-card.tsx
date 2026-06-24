"use client";

import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, Button } from "@lucreii/ui";
import { fadeInVariants } from "@/lib/animations";
import { translateApiMessage } from "@/lib/pt-br/api-ui";
import { formatDateTime, formatSyncOrigin } from "../lib/formatters";
import type { SyncStatusResponse } from "../types/integrations";
import { ManualSyncRangeErrorBanner } from "./manual-sync-range-error-banner";

const RANGE_ERROR_DESCRIBED_BY_ID = "manual-sync-range-error";

interface SyncControlCardProps {
  syncStatus?: SyncStatusResponse;
  startDate: string;
  endDate: string;
  rangeError: string | null;
  isLoading: boolean;
  isSyncing: boolean;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onSyncClick: () => void;
}

export function SyncControlCard({
  syncStatus,
  startDate,
  endDate,
  rangeError,
  isLoading,
  isSyncing,
  onStartDateChange,
  onEndDateChange,
  onSyncClick,
}: SyncControlCardProps) {
  const canSync = syncStatus?.availability.canRun ?? false;
  const hasSelectedDates = startDate.length > 0 || endDate.length > 0;
  const hasRangeError = hasSelectedDates && !!rangeError;
  const canSubmitManualSync =
    canSync &&
    !isSyncing &&
    startDate.length > 0 &&
    endDate.length > 0 &&
    !rangeError;

  const statusInfo = (() => {
    if (isLoading || !syncStatus) {
      return {
        icon: <RefreshCw className="h-4 w-4 animate-spin" />,
        subtitle: "Verificando status",
        title: "Carregando...",
      };
    }
    if (canSync) {
      return {
        icon: <CheckCircle2 className="h-4 w-4 text-success" />,
        subtitle: "Você pode executar uma sincronização agora.",
        title: "Pronto para sincronizar",
      };
    }
    return {
      icon: <AlertCircle className="h-4 w-4 text-muted-foreground" />,
      subtitle:
        translateApiMessage(syncStatus.availability.message) || "Aguarde",
      title: "Sincronização indisponível",
    };
  })();

  const lastSync = syncStatus?.availability.lastSuccessfulSyncAt;

  return (
    <motion.div variants={fadeInVariants}>
      <Card variant="outlined" className="p-5">
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Inicial
              </span>
              <input
                id="manual-sync-start"
                type="date"
                value={startDate}
                onChange={(event) => onStartDateChange(event.target.value)}
                aria-invalid={hasRangeError}
                aria-describedby={
                  hasRangeError ? RANGE_ERROR_DESCRIBED_BY_ID : undefined
                }
                className={
                  hasRangeError
                    ? "w-full rounded-lg border border-error/60 bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-error focus:outline-2 focus:outline-error/25"
                    : "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
                }
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Final
              </span>
              <input
                id="manual-sync-end"
                type="date"
                value={endDate}
                onChange={(event) => onEndDateChange(event.target.value)}
                aria-invalid={hasRangeError}
                aria-describedby={
                  hasRangeError ? RANGE_ERROR_DESCRIBED_BY_ID : undefined
                }
                className={
                  hasRangeError
                    ? "w-full rounded-lg border border-error/60 bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-error focus:outline-2 focus:outline-error/25"
                    : "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
                }
              />
            </label>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{statusInfo.icon}</div>
              <div>
                <h3 className="font-medium text-foreground">
                  {statusInfo.title}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {statusInfo.subtitle}
                </p>
              </div>
            </div>

            <Button
              size="sm"
              disabled={!canSubmitManualSync}
              loading={isSyncing}
              onClick={onSyncClick}
              className="shrink-0 gap-2 rounded-lg bg-accent px-5 text-sm font-semibold text-white shadow-[var(--shadow-sm)] transition-all duration-[var(--transition-fast)] hover:-translate-y-0.5 hover:bg-accent-strong hover:text-white hover:shadow-[var(--shadow-md)]"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              {isSyncing ? "Sincronizando..." : "Sincronizar agora"}
            </Button>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {hasSelectedDates && rangeError ? (
              <ManualSyncRangeErrorBanner
                key="range-error"
                error={rangeError}
                describedById={RANGE_ERROR_DESCRIBED_BY_ID}
              />
            ) : null}
          </AnimatePresence>

          {!isLoading && syncStatus && (
            <div className="mt-4 flex gap-6 border-t border-border/40 pt-3 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  Última: {lastSync ? formatDateTime(lastSync) : "Nunca"}
                </span>
              </div>

              {syncStatus.lastCompletedRun && (
                <div className="ml-auto text-muted-foreground">
                  {syncStatus.lastCompletedRun.counts.orders} pedidos na última
                  sincronização ·{" "}
                  {formatSyncOrigin(syncStatus.lastCompletedRun.origin)}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
