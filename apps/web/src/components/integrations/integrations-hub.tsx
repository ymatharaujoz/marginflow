"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Beaker, Link2, Activity } from "lucide-react";
import { Badge } from "@marginflow/ui";
import { ApiClientError } from "@/lib/api/client";
import { translateApiMessage } from "@/lib/pt-br/api-ui";
import { containerVariants, fadeInVariants } from "@/lib/animations";
import {
  IntegrationsHeader,
  IntegrationsList,
  SyncStatusGrid,
  SyncControlCard,
  SyncHistorySection,
  LoadingIntegrations,
  ErrorState,
  useIntegrationsData,
} from "@/modules/integrations";
import type { IntegrationProviderSlug, RunSyncResponse } from "@marginflow/types";

interface IntegrationsHubProps {
  initialMessage: string | null;
  initialStatus: "error" | "success" | null;
  organizationName: string;
}

export function IntegrationsHub({ initialMessage, initialStatus, organizationName }: IntegrationsHubProps) {
  // Estado de mensagens (vindas da URL ou ações do usuário)
  const [message, setMessage] = useState<string | null>(() =>
    initialMessage ? translateApiMessage(initialMessage) || initialMessage : null,
  );
  const [messageTone, setMessageTone] = useState<"critical" | "neutral">(
    initialStatus === "error" ? "critical" : "neutral",
  );

  // Estados de ações em andamento
  const [busyProvider, setBusyProvider] = useState<IntegrationProviderSlug | null>(null);
  const [busyAction, setBusyAction] = useState<"connect" | "disconnect" | null>(null);

  // Fetch de dados
  const {
    integrationsQuery,
    syncStatusQuery,
    syncHistoryQuery,
    connectMutation,
    disconnectMutation,
    syncMutation,
    clearHistoryMutation,
    refetchAll,
  } = useIntegrationsData({
    onSyncSuccess: (data: RunSyncResponse) => {
      const n = data.run.counts.orders;
      setMessage(`Sincronização finalizada com ${n} pedido${n === 1 ? "" : "s"} importado${n === 1 ? "" : "s"}.`);
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
          setMessage(error instanceof ApiClientError ? error.message : "Não foi possível desconectar.");
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
        syncStatusQuery.error instanceof Error ? syncStatusQuery.error.message : "Erro ao carregar status.",
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
      setMessageTone(criticalReasons.has(status.availability.reason) ? "critical" : "neutral");
      return;
    }

    syncMutation.mutate();
  }, [syncMutation, syncStatusQuery]);

  // Handler de limpar histórico
  const handleClearHistory = useCallback(() => {
    if (syncHistoryQuery.data?.length === 0 || clearHistoryMutation.isPending) return;
    setMessage(null);
    clearHistoryMutation.mutate(undefined, {
      onSuccess: (data) => {
        setMessage(
          data.clearedCount === 1 ? "1 registro removido." : `${data.clearedCount} registros removidos.`,
        );
        setMessageTone("neutral");
      },
      onError: (error) => {
        setMessage(error instanceof ApiClientError ? error.message : "Erro ao limpar histórico.");
        setMessageTone("critical");
      },
    });
  }, [clearHistoryMutation, syncHistoryQuery.data?.length]);

  // Estados de loading e erro
  if (integrationsQuery.isLoading) {
    return <LoadingIntegrations cardCount={1} />;
  }

  if (integrationsQuery.error) {
    return <ErrorState error={integrationsQuery.error} onRetry={refetchAll} />;
  }

  const displayMessage = message ? translateApiMessage(message) || message : null;
  const mercadoLivreConnection = integrationsQuery.data?.find((c) => c.provider === "mercadolivre");
  const isConnected = mercadoLivreConnection?.status === "connected";
  const lastCompletedRun = syncStatusQuery.data?.lastCompletedRun;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-10">
      {/* Banner de Modo de Demonstração */}
      {process.env.NODE_ENV === "development" && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2"
        >
          <div className="flex items-center gap-2">
            <Beaker className="h-4 w-4 text-warning" />
            <span className="text-sm font-medium text-foreground">Modo de demonstração</span>
            <Badge variant="warning" className="text-[10px]">
              Dados de teste
            </Badge>
          </div>
        </motion.div>
      )}

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
        onSync={handleSyncClick}
        isSyncing={syncMutation.isPending}
        canSync={syncStatusQuery.data?.availability.canRun ?? false}
        lastSyncDate={mercadoLivreConnection?.lastSyncedAt ?? undefined}
      />

      {/* Divider */}
      <div className="border-t border-border/60" />

      {/* Seção 1: Integrações Disponíveis */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Marketplaces Conectados
          </h2>
        </div>
        <IntegrationsList
          connections={integrationsQuery.data ?? []}
          isLoading={integrationsQuery.isLoading}
          isFetching={integrationsQuery.isFetching}
          busyProvider={busyProvider}
          busyAction={busyAction}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
        />
      </section>

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
            isLoading={syncStatusQuery.isLoading}
            isSyncing={syncMutation.isPending}
            onSyncClick={handleSyncClick}
          />
        </section>
      )}

      {/* Divider */}
      <div className="border-t border-border/60" />

      {/* Seção 4: Histórico de Sincronizações */}
      <SyncHistorySection
        syncHistory={syncHistoryQuery.data ?? []}
        isLoading={syncHistoryQuery.isLoading}
        isClearing={clearHistoryMutation.isPending}
        onClearHistory={handleClearHistory}
      />
    </motion.div>
  );
}
