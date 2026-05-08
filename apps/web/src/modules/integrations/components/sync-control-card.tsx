"use client";

import { motion } from "framer-motion";
import { RefreshCw, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, Button } from "@marginflow/ui";
import { fadeInVariants } from "@/lib/animations";
import { translateApiMessage, translateSyncWindowLabel } from "@/lib/pt-br/api-ui";
import { formatDateTime } from "../lib/formatters";
import type { SyncStatusResponse } from "../types/integrations";

interface SyncControlCardProps {
  syncStatus?: SyncStatusResponse;
  isLoading: boolean;
  isSyncing: boolean;
  onSyncClick: () => void;
}

export function SyncControlCard({
  syncStatus,
  isLoading,
  isSyncing,
  onSyncClick,
}: SyncControlCardProps) {
  const canSync = syncStatus?.availability.canRun ?? false;

  const statusInfo = (() => {
    if (isLoading || !syncStatus) {
      return {
        icon: <RefreshCw className="h-4 w-4 animate-spin" />,
        title: "Carregando...",
        subtitle: "Verificando status",
      };
    }
    if (canSync) {
      return {
        icon: <CheckCircle2 className="h-4 w-4 text-success" />,
        title: "Pronto para sincronizar",
        subtitle: "Você pode executar uma sincronização agora",
      };
    }
    return {
      icon: <AlertCircle className="h-4 w-4 text-muted-foreground" />,
      title: "Sincronização indisponível",
      subtitle: translateApiMessage(syncStatus.availability.message) || "Aguarde a próxima janela",
    };
  })();

  const nextWindow = syncStatus?.availability.nextAvailableAt;
  const lastSync = syncStatus?.availability.lastSuccessfulSyncAt;

  return (
    <motion.div variants={fadeInVariants}>
      <Card variant="outlined" className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Status */}
          <div className="flex items-start gap-3">
            <div className="mt-0.5">{statusInfo.icon}</div>
            <div>
              <h3 className="font-medium text-foreground">{statusInfo.title}</h3>
              <p className="text-xs text-muted-foreground">{statusInfo.subtitle}</p>
            </div>
          </div>

          {/* Sync Button */}
          <Button
            size="sm"
            disabled={!canSync || isSyncing}
            loading={isSyncing}
            onClick={onSyncClick}
            className="shrink-0"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            {isSyncing ? "Sincronizando..." : "Sincronizar agora"}
          </Button>
        </div>

        {/* Mini stats row */}
        {!isLoading && syncStatus && (
          <div className="mt-4 flex gap-6 border-t border-border/40 pt-3 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>Última: {lastSync ? formatDateTime(lastSync) : "Nunca"}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>
                Próxima: {canSync ? "Agora" : nextWindow ? formatDateTime(nextWindow) : "-"}
              </span>
            </div>
            {syncStatus.lastCompletedRun && (
              <div className="ml-auto text-muted-foreground">
                {syncStatus.lastCompletedRun.counts.orders} pedidos na última sincronização
              </div>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  );
}
