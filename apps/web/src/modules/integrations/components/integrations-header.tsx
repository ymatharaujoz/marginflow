"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { Button } from "@marginflow/ui";
import { StatusBadge } from "@/components/ui-premium/status-badge";
import { fadeInVariants } from "@/lib/animations";

interface IntegrationsHeaderProps {
  organizationName: string;
  isConnected?: boolean;
  onSync?: () => void;
  isSyncing?: boolean;
  canSync?: boolean;
  lastSyncDate?: string;
}

export function IntegrationsHeader({
  organizationName,
  isConnected = false,
  onSync,
  isSyncing = false,
  canSync = false,
  lastSyncDate,
}: IntegrationsHeaderProps) {
  const relativeTime = useMemo(() => {
    if (!lastSyncDate) return "nunca";
    const date = new Date(lastSyncDate);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "há menos de 1 hora";
    if (hours === 1) return "há 1 hora";
    if (hours < 24) return `há ${hours} horas`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "há 1 dia";
    return `há ${days} dias`;
  }, [lastSyncDate]);

  return (
    <motion.div variants={fadeInVariants} initial="hidden" animate="visible" className="space-y-4">
      {/* Título e Subtítulo */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Integrações
            </h1>
            <StatusBadge
              status={isConnected ? "success" : "inactive"}
              label={isConnected ? "Conectado" : "Desconectado"}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Gerencie a conexão de <span className="font-medium text-foreground">{organizationName}</span> com seus marketplaces
            {isConnected && (
              <> Última sincronização: <span className="font-medium text-foreground">{relativeTime}</span>.</>
            )}
          </p>
        </div>
      </div>

      {/* Barra de Ações */}
      {isConnected && (
        <div className="flex flex-wrap items-center gap-3 border-y border-border py-4">
          <Button
            onClick={onSync}
            disabled={!canSync || isSyncing}
            loading={isSyncing}
            size="sm"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>{isSyncing ? "Sincronizando..." : "Sincronizar agora"}</span>
          </Button>

          <div className="ml-auto hidden items-center gap-3 text-sm text-muted-foreground sm:flex">
            <span className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${isConnected ? "bg-success" : "bg-muted"}`} />
              Mercado Livre
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
