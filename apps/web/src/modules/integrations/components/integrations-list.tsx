"use client";

import { motion } from "framer-motion";
import { Store, ExternalLink, Power, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, Button, Badge } from "@marginflow/ui";
import { containerVariants, itemVariants } from "@/lib/animations";
import { translateConnectionUiStatus } from "@/lib/pt-br/api-ui";
import { formatDateTime } from "../lib/formatters";
import type { IntegrationConnectionRecord, IntegrationProviderSlug } from "../types/integrations";

interface IntegrationsListProps {
  connections: IntegrationConnectionRecord[];
  isLoading: boolean;
  isFetching: boolean;
  busyProvider: IntegrationProviderSlug | null;
  busyAction: "connect" | "disconnect" | null;
  onConnect: (provider: IntegrationProviderSlug) => void;
  onDisconnect: (provider: IntegrationProviderSlug) => void;
}

const providerIcons: Record<string, React.ReactNode> = {
  mercadolivre: <img src="/icons/mercado-libre-icon.svg" alt="Mercado Livre" className="h-5 w-auto" />,
  shopee: <img src="/icons/shopee-icon.svg" alt="Shopee" className="h-5 w-auto" />,
};

const providerNames: Record<string, string> = {
  mercadolivre: "Mercado Livre",
  shopee: "Shopee",
};

export function IntegrationsList({
  connections,
  isLoading,
  isFetching,
  busyProvider,
  busyAction,
  onConnect,
  onDisconnect,
}: IntegrationsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-20 animate-pulse rounded-[var(--radius-lg)] bg-surface-strong" />
        <div className="h-20 animate-pulse rounded-[var(--radius-lg)] bg-surface-strong" />
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <Card variant="outlined" className="p-8 text-center">
        <p className="text-muted-foreground">Nenhuma integração disponível.</p>
      </Card>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-3"
    >
      {connections.map((connection) => {
        const isConnecting = busyAction === "connect" && busyProvider === connection.provider;
        const isDisconnecting = busyAction === "disconnect" && busyProvider === connection.provider;
        const isBusy = isConnecting || isDisconnecting;
        const isConnected = connection.status === "connected";
        const isError = connection.status === "needs_reconnect";

        return (
          <motion.div key={connection.provider} variants={itemVariants}>
            <Card
              variant="outlined"
              className={`relative overflow-hidden p-4 transition-all hover:border-border ${
                isConnected ? "border-success/30 bg-success-soft/10" : ""
              } ${isError ? "border-warning/30 bg-warning-soft/10" : ""}`}
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${
                    isConnected
                      ? "bg-success/10 text-success"
                      : isError
                        ? "bg-warning/10 text-warning"
                        : "bg-muted/20 text-muted-foreground"
                  }`}
                >
                  {providerIcons[connection.provider] || <Store className="h-5 w-5" />}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground">
                      {providerNames[connection.provider] || connection.displayName}
                    </h3>
                    <Badge
                      variant={
                        isConnected ? "success" : isError ? "warning" : "neutral"
                      }
                      className="text-[10px]"
                    >
                      {translateConnectionUiStatus(connection.status)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isConnected
                      ? `Conectado como ${connection.connectedAccountLabel || connection.connectedAccountId || "usuário"}`
                      : connection.statusMessage}
                  </p>
                  {isConnected && connection.lastSyncedAt && (
                    <p className="text-xs text-muted-foreground">
                      Última sincronização: {formatDateTime(connection.lastSyncedAt)}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-2">
                  {isConnected ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDisconnect(connection.provider)}
                      disabled={isBusy || isFetching}
                      loading={isDisconnecting}
                      className="text-muted-foreground hover:text-error"
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => onConnect(connection.provider)}
                      disabled={!connection.connectAvailable || isBusy || isFetching}
                      loading={isConnecting}
                    >
                      <ExternalLink className="mr-1 h-3.5 w-3.5" />
                      Conectar
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
