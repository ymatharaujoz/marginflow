"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Badge, Button, Card, EmptyState, Skeleton } from "@marginflow/ui";
import type {
  IntegrationConnectionRecord,
  IntegrationConnectResponse,
  IntegrationProviderSlug,
  RunSyncResponse,
  SyncRunRecord,
  SyncStatusResponse,
} from "@marginflow/types";
import { ApiClientError, apiClient } from "@/lib/api/client";
import {
  translateApiMessage,
  translateConnectionUiStatus,
  translateIntegrationButtonLabel,
  translateSyncRunStatus,
  translateSyncWindowLabel,
} from "@/lib/pt-br/api-ui";

const integrationsQueryKey = ["integrations"] as const;
const syncProvider: IntegrationProviderSlug = "mercadolivre";
const syncStatusQueryKey = ["sync-status", syncProvider] as const;
const syncHistoryQueryKey = ["sync-history", syncProvider] as const;

type IntegrationsHubProps = {
  initialMessage: string | null;
  initialStatus: "error" | "success" | null;
  organizationName: string;
};

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatCounts(run: SyncRunRecord) {
  const o = run.counts.orders;
  const p = run.counts.products;
  const i = run.counts.items;
  const f = run.counts.fees;
  return `${o} pedido${o === 1 ? "" : "s"}, ${p} produto${p === 1 ? "" : "s"}, ${i} item${i === 1 ? "" : "s"}, ${f} taxa${f === 1 ? "" : "s"}`;
}

async function fetchIntegrations(): Promise<IntegrationConnectionRecord[]> {
  const response = await apiClient.get<{ data: IntegrationConnectionRecord[]; error: null }>("/integrations");
  return response.data;
}

async function fetchSyncStatus(): Promise<SyncStatusResponse> {
  const response = await apiClient.get<{ data: SyncStatusResponse; error: null }>(
    `/sync/status?provider=${syncProvider}`,
  );
  return response.data;
}

async function fetchSyncHistory(): Promise<SyncRunRecord[]> {
  const response = await apiClient.get<{ data: SyncRunRecord[]; error: null }>(
    `/sync/history?provider=${syncProvider}`,
  );
  return response.data;
}

export function IntegrationsHub({ initialMessage, initialStatus, organizationName }: IntegrationsHubProps) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(() =>
    initialMessage ? translateApiMessage(initialMessage) || initialMessage : null,
  );
  const [messageTone, setMessageTone] = useState<"critical" | "neutral">(
    initialStatus === "error" ? "critical" : "neutral",
  );
  const [busyProvider, setBusyProvider] = useState<IntegrationProviderSlug | null>(null);
  const [busyAction, setBusyAction] = useState<"connect" | "disconnect" | null>(null);

  const integrationsQuery = useQuery({ queryFn: fetchIntegrations, queryKey: integrationsQueryKey });
  const syncStatusQuery = useQuery({ queryFn: fetchSyncStatus, queryKey: syncStatusQueryKey });
  const syncHistoryQuery = useQuery({ queryFn: fetchSyncHistory, queryKey: syncHistoryQueryKey });

  const connectMutation = useMutation({
    mutationFn: async (provider: IntegrationProviderSlug) => {
      const response = await apiClient.post<{ data: IntegrationConnectResponse; error: null }>(
        `/integrations/${provider}/connect`,
      );
      return response.data;
    },
    onError: (error) => {
      setMessage(
        error instanceof ApiClientError ? error.message : "Não foi possível iniciar a conexão do provedor.",
      );
      setMessageTone("critical");
    },
    onSuccess: (data) => {
      window.location.assign(data.authorizationUrl);
    },
    onSettled: () => {
      setBusyAction(null);
      setBusyProvider(null);
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (provider: IntegrationProviderSlug) => {
      const response = await apiClient.post<{ data: IntegrationConnectionRecord; error: null }>(
        `/integrations/${provider}/disconnect`,
      );
      return response.data;
    },
    onError: (error) => {
      setMessage(error instanceof ApiClientError ? error.message : "Não foi possível desconectar o provedor.");
      setMessageTone("critical");
    },
    onSuccess: async (record) => {
      setMessage(`${record.displayName} desconectado localmente.`);
      setMessageTone("neutral");
      await queryClient.invalidateQueries({ queryKey: integrationsQueryKey });
      await queryClient.invalidateQueries({ queryKey: syncStatusQueryKey });
      await queryClient.invalidateQueries({ queryKey: syncHistoryQueryKey });
    },
    onSettled: () => {
      setBusyAction(null);
      setBusyProvider(null);
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<{ data: RunSyncResponse; error: null }>("/sync/run", {
        body: { provider: syncProvider },
      });
      return response.data;
    },
    onError: (error) => {
      setMessage(error instanceof ApiClientError ? error.message : "Não foi possível iniciar a sincronização.");
      setMessageTone("critical");
    },
    onSuccess: async (data) => {
      const n = data.run.counts.orders;
      setMessage(
        `Sincronização finalizada com ${n} pedido${n === 1 ? "" : "s"} importado${n === 1 ? "" : "s"}.`,
      );
      setMessageTone("neutral");
      await queryClient.invalidateQueries({ queryKey: integrationsQueryKey });
      await queryClient.invalidateQueries({ queryKey: syncStatusQueryKey });
      await queryClient.invalidateQueries({ queryKey: syncHistoryQueryKey });
    },
  });

  function handleConnect(provider: IntegrationProviderSlug) {
    setBusyAction("connect");
    setBusyProvider(provider);
    setMessage(null);
    connectMutation.mutate(provider);
  }

  function handleDisconnect(provider: IntegrationProviderSlug) {
    setBusyAction("disconnect");
    setBusyProvider(provider);
    setMessage(null);
    disconnectMutation.mutate(provider);
  }

  const syncStatus = syncStatusQuery.data;
  const syncHistory = syncHistoryQuery.data ?? [];
  const mercadoLivreConnection = integrationsQuery.data?.find((c) => c.provider === syncProvider);
  const syncUnavailable =
    mercadoLivreConnection?.status === "unavailable" || syncStatus?.availability.reason === "provider_unavailable";

  const displayMessage = message ? translateApiMessage(message) || message : null;

  return (
    <div className="space-y-6">
      <div className="animate-rise-in">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Integrações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conecte {organizationName} aos canais de marketplace e gerencie sincronizações.
        </p>
      </div>

      {displayMessage && (
        <div
          className={
            messageTone === "critical"
              ? "rounded-[var(--radius-md)] border border-error/20 bg-error-soft px-4 py-3 text-sm text-foreground"
              : "rounded-[var(--radius-md)] border border-accent/20 bg-accent-soft px-4 py-3 text-sm text-foreground"
          }
        >
          {displayMessage}
        </div>
      )}

      {integrationsQuery.isLoading && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      )}

      {integrationsQuery.error && (
        <Card variant="outlined" className="border-error/20">
          <p className="text-sm font-medium text-error">
            {integrationsQuery.error instanceof Error ? integrationsQuery.error.message : "Erro inesperado de conexão."}
          </p>
        </Card>
      )}

      {integrationsQuery.data && (
        <div className="grid gap-4 xl:grid-cols-2">
          {integrationsQuery.data.map((connection) => {
            const isConnecting = busyAction === "connect" && busyProvider === connection.provider;
            const isDisconnecting = busyAction === "disconnect" && busyProvider === connection.provider;
            const connectedAccount = connection.connectedAccountLabel ?? connection.connectedAccountId;

            return (
              <Card key={connection.provider} variant="interactive" className="animate-rise-in">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-accent-soft text-accent">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-foreground">{connection.displayName}</h2>
                      <p className="text-xs text-muted-foreground">{connection.provider}</p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      connection.status === "connected"
                        ? "success"
                        : connection.status === "needs_reconnect"
                          ? "warning"
                          : connection.status === "unavailable"
                            ? "neutral"
                            : "info"
                    }
                  >
                    {translateConnectionUiStatus(connection.status)}
                  </Badge>
                </div>

                <p className="mt-4 text-sm text-muted-foreground">{translateApiMessage(connection.statusMessage)}</p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Conta</p>
                    <p className="mt-0.5 text-sm text-foreground">{connectedAccount ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Token expira</p>
                    <p className="mt-0.5 text-sm text-foreground">{formatDateTime(connection.tokenExpiresAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Última sincronização</p>
                    <p className="mt-0.5 text-sm text-foreground">{formatDateTime(connection.lastSyncedAt)}</p>
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
                  <Button
                    disabled={
                      !connection.connectAvailable || busyProvider !== null || integrationsQuery.isFetching
                    }
                    loading={isConnecting}
                    onClick={() => handleConnect(connection.provider)}
                    size="sm"
                  >
                    {translateIntegrationButtonLabel(connection.connectLabel)}
                  </Button>
                  {connection.disconnectAvailable && (
                    <Button
                      disabled={busyProvider !== null || integrationsQuery.isFetching}
                      loading={isDisconnecting}
                      onClick={() => handleDisconnect(connection.provider)}
                      size="sm"
                      variant="ghost"
                    >
                      {translateIntegrationButtonLabel(connection.disconnectLabel ?? "Disconnect")}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Sincronização manual</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Uma sincronização por janela diária. As métricas financeiras são atualizadas após cada importação bem-sucedida.
            </p>
          </div>
          <Button
            disabled={
              syncMutation.isPending ||
              syncStatusQuery.isLoading ||
              !syncStatus?.availability.canRun ||
              Boolean(syncUnavailable)
            }
            loading={syncMutation.isPending}
            onClick={() => {
              setMessage(null);
              syncMutation.mutate();
            }}
          >
            Sincronizar agora
          </Button>
        </div>

        {syncStatusQuery.isLoading && <Skeleton className="mt-4 h-20" />}
        {syncStatusQuery.error && (
          <div className="mt-4 rounded-[var(--radius-md)] border border-error/20 bg-error-soft px-4 py-3 text-sm text-error">
            {syncStatusQuery.error instanceof Error ? syncStatusQuery.error.message : "Erro inesperado no status da sync."}
          </div>
        )}

        {syncStatus && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[var(--radius-md)] border border-border bg-background-soft px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground">Disponibilidade</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {syncStatus.availability.canRun ? "Disponível agora" : "Bloqueada"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{translateApiMessage(syncStatus.availability.message)}</p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border bg-background-soft px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground">Janela atual</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {translateSyncWindowLabel(syncStatus.availability.currentWindowLabel)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Próxima: {formatDateTime(syncStatus.availability.nextAvailableAt)}
              </p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border bg-background-soft px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground">Último sucesso</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {formatDateTime(syncStatus.availability.lastSuccessfulSyncAt)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {syncStatus.lastCompletedRun ? formatCounts(syncStatus.lastCompletedRun) : "Ainda não houve importação"}
              </p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border bg-background-soft px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground">Execução ativa</p>
                {syncStatus.activeRun ? translateSyncRunStatus(syncStatus.activeRun.status) : "Nenhuma"}
            </div>
          </div>
        )}

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-foreground">Histórico recente</h3>
          {syncHistoryQuery.isLoading && <Skeleton className="mt-3 h-16" />}
          {syncHistory.length === 0 && !syncHistoryQuery.isLoading && (
            <EmptyState
              className="py-8"
              title="Nenhuma sincronização ainda"
              description="Conecte um provedor e execute a primeira sync para ver o histórico aqui."
            />
          )}
          {syncHistory.length > 0 && (
            <div className="mt-3 space-y-2">
              {syncHistory.map((run) => (
                <div key={run.id} className="rounded-[var(--radius-md)] border border-border bg-background-soft px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={run.status === "completed" ? "success" : run.status === "failed" ? "error" : "neutral"}>
                        {translateSyncRunStatus(run.status)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{run.windowKey ?? "—"}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatCounts(run)}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {formatDateTime(run.startedAt)} → {formatDateTime(run.finishedAt)}
                  </p>
                  {run.errorSummary && <p className="mt-2 text-xs text-error">{run.errorSummary}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
