"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Activity } from "lucide-react";
import { ApiClientError } from "@/lib/api/client";
import { translateApiMessage } from "@/lib/pt-br/api-ui";
import { containerVariants, fadeInVariants } from "@/lib/animations";
import {
  IntegrationsHeader,
  ConnectedMarketplacesSection,
  SyncStatusGrid,
  SyncControlCard,
  LoadingIntegrations,
  ErrorState,
  useIntegrationsData,
} from "@/modules/integrations";
import {
  buildManualSyncPayload,
  validateManualSyncRange,
} from "@/modules/integrations/lib/manual-sync-range";
import type { IntegrationProviderSlug, RunSyncResponse } from "@lucreii/types";

interface IntegrationsHubProps {
  initialMessage: string | null;
  initialStatus: "error" | "success" | null;
  organizationName: string;
}

export function IntegrationsHub({
  initialMessage,
  initialStatus,
  organizationName,
}: IntegrationsHubProps) {
  const [syncProvider, setSyncProvider] =
    useState<IntegrationProviderSlug>("mercadolivre");
  // Estado de mensagens (vindas da URL ou ações do usuário)
  const [message, setMessage] = useState<string | null>(() => {
    if (!initialMessage) return null;
    const translated = translateApiMessage(initialMessage) || initialMessage;
    if (translated === "Mercado Livre conectado com sucesso.") return null;
    return translated;
  });
  const [messageTone, setMessageTone] = useState<"critical" | "neutral">(
    initialStatus === "error" ? "critical" : "neutral",
  );

  // Estados de ações em andamento
  const [busyProvider, setBusyProvider] =
    useState<IntegrationProviderSlug | null>(null);
  const [busyAction, setBusyAction] = useState<"connect" | "disconnect" | null>(
    null,
  );
  const [manualSyncDates, setManualSyncDates] = useState({
    endDate: "",
    startDate: "",
  });

  // Fetch de dados
  const {
    integrationsQuery,
    syncStatusQuery,
    connectMutation,
    disconnectMutation,
    syncMutation,
    refetchAll,
  } = useIntegrationsData(syncProvider, {
    onSyncSuccess: (data: RunSyncResponse) => {
      const n = data.run.counts.orders;
      setMessage(
        `Sincronização finalizada com ${n} pedido${n === 1 ? "" : "s"} importado${n === 1 ? "" : "s"}.`,
      );
      setMessageTone("neutral");
    },
  });

  // Handlers de conexão/desconexão
  const handleConnect = useCallback(
    (provider: IntegrationProviderSlug) => {
      setBusyAction("connect");
      setBusyProvider(provider);
      setMessage(null);
      connectMutation.mutate(provider);
    },
    [connectMutation],
  );

  const handleDisconnect = useCallback(
    (provider: IntegrationProviderSlug) => {
      setBusyAction("disconnect");
      setBusyProvider(provider);
      setMessage(null);
      disconnectMutation.mutate(provider, {
        onSuccess: (record) => {
          setMessage(`${record.displayName} desconectado.`);
          setMessageTone("neutral");
        },
        onError: (error) => {
          setMessage(
            error instanceof ApiClientError
              ? error.message
              : "Não foi possível desconectar.",
          );
          setMessageTone("critical");
          setBusyAction(null);
          setBusyProvider(null);
        },
      });
    },
    [disconnectMutation],
  );

  // Handler de sincronização
  const handleSyncClick = useCallback(() => {
    setMessage(null);

    if (syncStatusQuery.isLoading) return;

    if (syncStatusQuery.error) {
      setMessage(
        syncStatusQuery.error instanceof Error
          ? syncStatusQuery.error.message
          : "Erro ao carregar status.",
      );
      setMessageTone("critical");
      return;
    }

    const status = syncStatusQuery.data;
    if (!status) {
      setMessage("Aguarde o carregamento do status.");
      setMessageTone("neutral");
      return;
    }

    if (!status.availability.canRun) {
      const msg =
        translateApiMessage(status.availability.message) ||
        status.availability.message ||
        "Sincronização indisponível.";
      setMessage(msg);
      const criticalReasons = new Set([
        "provider_disconnected",
        "provider_needs_reconnect",
        "provider_unavailable",
        "provider_sync_unsupported",
      ]);
      setMessageTone(
        criticalReasons.has(status.availability.reason)
          ? "critical"
          : "neutral",
      );
      return;
    }

    const validation = validateManualSyncRange(manualSyncDates);
    if (!validation.isValid) {
      setMessage(validation.error);
      setMessageTone("critical");
      return;
    }

    syncMutation.mutate(buildManualSyncPayload(syncProvider, manualSyncDates));
  }, [manualSyncDates, syncMutation, syncProvider, syncStatusQuery]);

  // Estados de loading e erro
  if (integrationsQuery.isLoading) {
    return <LoadingIntegrations cardCount={1} />;
  }

  if (integrationsQuery.error) {
    return <ErrorState error={integrationsQuery.error} onRetry={refetchAll} />;
  }

  const displayMessage = message
    ? translateApiMessage(message) || message
    : null;
  const activeConnection = integrationsQuery.data?.find(
    (c) => c.provider === syncProvider,
  );
  const isConnected = activeConnection?.status === "connected";
  const lastCompletedRun = syncStatusQuery.data?.lastCompletedRun;
  const manualSyncValidation = validateManualSyncRange(manualSyncDates);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-10"
    >
      {/* Banner de Mensagem */}
      {displayMessage && (
        <motion.div
          role="status"
          variants={fadeInVariants}
          initial="hidden"
          animate="visible"
          className={
            messageTone === "critical"
              ? "flex gap-3 rounded-[var(--radius-lg)] border border-error/20 bg-error-soft/80 px-4 py-3"
              : "flex gap-3 rounded-[var(--radius-lg)] border border-success/20 bg-success-soft/80 px-4 py-3"
          }
        >
          <span
            className={
              messageTone === "critical"
                ? "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-error/10"
                : "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success/10"
            }
          >
            <AlertCircle
              className={`h-3 w-3 ${messageTone === "critical" ? "text-error" : "text-success"}`}
            />
          </span>
          <p className="text-sm text-foreground">{displayMessage}</p>
        </motion.div>
      )}

      {/* Cabeçalho da Página */}
      <IntegrationsHeader
        organizationName={organizationName}
        isConnected={isConnected}
      />

      {/* Divider */}
      <div className="border-t border-border/60" />

      {/* Seção 1: Marketplaces Conectados — Design Premium */}
      <ConnectedMarketplacesSection
        connections={integrationsQuery.data ?? []}
        isLoading={integrationsQuery.isLoading}
        isFetching={integrationsQuery.isFetching}
        busyProvider={busyProvider}
        busyAction={busyAction}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />

      {/* Divider */}
      <div className="border-t border-border/60" />

      {/* Seção 2: Status da Sincronização */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Status da Sincronização
          </h2>
        </div>
        <div className="flex w-fit rounded-lg border border-border bg-surface-strong p-1">
          {(
            [
              ["mercadolivre", "Mercado Livre"],
              ["shopee", "Shopee"],
              ["shein", "Shein"],
            ] as const
          ).map(([provider, label]) => (
            <button
              key={provider}
              type="button"
              onClick={() => setSyncProvider(provider)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                syncProvider === provider
                  ? "bg-accent text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <SyncStatusGrid
          syncStatus={syncStatusQuery.data}
          lastRun={lastCompletedRun ?? undefined}
          isLoading={syncStatusQuery.isLoading}
        />
      </section>

      {/* Divider */}
      {isConnected && <div className="border-t border-border/60" />}

      {/* Seção 3: Controle de Sincronização (apenas quando conectado) */}
      {isConnected && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Ações de Sincronização
            </h2>
          </div>
          <SyncControlCard
            syncStatus={syncStatusQuery.data}
            endDate={manualSyncDates.endDate}
            isLoading={syncStatusQuery.isLoading}
            isSyncing={syncMutation.isPending}
            onEndDateChange={(value) =>
              setManualSyncDates((current) => ({ ...current, endDate: value }))
            }
            onStartDateChange={(value) =>
              setManualSyncDates((current) => ({
                ...current,
                startDate: value,
              }))
            }
            onSyncClick={handleSyncClick}
            rangeError={manualSyncValidation.error}
            startDate={manualSyncDates.startDate}
          />
        </section>
      )}
    </motion.div>
  );
}
